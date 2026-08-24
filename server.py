from flask import Flask, request, jsonify, send_from_directory, session, url_for
import sqlite3, os, secrets
from werkzeug.utils import secure_filename
from functools import wraps

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.environ.get("DATABASE_PATH", os.path.join(BASE, "dear_nadiya.db"))
UPLOAD_DIR = os.path.join(BASE, "uploads")
ALLOWED_EXTENSIONS = {"png","jpg","jpeg","webp","pdf"}
MAX_UPLOAD = 8 * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)
app = Flask(__name__, static_folder=BASE, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "change-this-secret-before-production")
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def admin_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error":"Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapped

def init_db():
    c = conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS products(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      deadline TEXT,
      quota TEXT,
      stock INTEGER DEFAULT 0,
      emoji TEXT DEFAULT '💗',
      options TEXT DEFAULT 'Random',
      dp_allowed INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      instagram TEXT,
      address TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      total INTEGER NOT NULL,
      amount_due INTEGER NOT NULL,
      payment_status TEXT DEFAULT 'Menunggu Pembayaran',
      payment_proof TEXT,
      order_status TEXT DEFAULT 'Pesanan Dibuat',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      selected_option TEXT,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL
    );
    """)
    if c.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        c.executemany("""INSERT INTO products(type,name,price,deadline,quota,stock,emoji,options,dp_allowed)
        VALUES(?,?,?,?,?,?,?,?,?)""", [
            ("go","TREASURE 3RD FULL ALBUM",120000,"30 Agustus 2026","30/50",0,"💿","Random,Member Version,Limited Edition",1),
            ("go","NCT DREAM OFFICIAL MD",85000,"28 Agustus 2026","20/40",0,"🎁","Random,Member Version",1),
            ("go","SEVENTEEN CARAT LAND MD",95000,"1 September 2026","15/30",0,"📦","Random,Set",1),
            ("ready","TXT OFFICIAL LIGHT STICK",850000,None,None,3,"💡","Ready Stock",0),
            ("ready","TREASURE OFFICIAL PHOTOCARD",45000,None,None,12,"🖼️","Random,Pilih Member",0),
            ("ready","NCT DREAM KEYCHAIN",70000,None,None,8,"🔑","Random",0)
        ])
    c.commit(); c.close()

@app.route("/")
def home(): return send_from_directory(BASE, "index.html")

@app.route("/admin")
def admin_page(): return send_from_directory(BASE, "admin.html")

@app.route("/api/products")
def products():
    c=conn()
    rows=c.execute("SELECT * FROM products WHERE active=1 ORDER BY id DESC").fetchall()
    c.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/orders", methods=["POST"])
def create_order():
    data=request.get_json()
    required=["customer_name","whatsapp","address","payment_type","items"]
    if not all(data.get(x) for x in required): return jsonify({"error":"Data belum lengkap"}),400
    items=data["items"]
    c=conn()
    total=0; any_dp=False; clean=[]
    for x in items:
        p=c.execute("SELECT * FROM products WHERE id=? AND active=1",(x.get("product_id"),)).fetchone()
        if not p: c.close(); return jsonify({"error":"Produk tidak ditemukan"}),400
        qty=max(1,int(x.get("qty",1)))
        total += p["price"]*qty
        any_dp = any_dp or bool(p["dp_allowed"])
        clean.append((p,x,qty))
    amount_due = total//2 if data["payment_type"]=="dp" and any_dp else total
    code="DN-2026-"+secrets.token_hex(3).upper()
    cur=c.execute("""INSERT INTO orders(order_code,customer_name,whatsapp,instagram,address,payment_type,total,amount_due)
    VALUES(?,?,?,?,?,?,?,?)""",(code,data["customer_name"],data["whatsapp"],data.get("instagram",""),data["address"],data["payment_type"],total,amount_due))
    oid=cur.lastrowid
    for p,x,qty in clean:
        c.execute("""INSERT INTO order_items(order_id,product_id,product_name,selected_option,qty,price)
        VALUES(?,?,?,?,?,?)""",(oid,p["id"],p["name"],x.get("selected_option","Random"),qty,p["price"]))
    c.commit(); c.close()
    return jsonify({"success":True,"order_code":code,"total":total,"amount_due":amount_due})

@app.route("/api/payment-proof/<code>", methods=["POST"])
def upload_payment_proof(code):
    order_code = code.upper().strip()
    if "proof" not in request.files:
        return jsonify({"error":"Pilih file bukti pembayaran terlebih dahulu"}), 400
    f = request.files["proof"]
    if not f.filename:
        return jsonify({"error":"Pilih file bukti pembayaran terlebih dahulu"}), 400
    if "." not in f.filename or f.filename.rsplit(".",1)[1].lower() not in ALLOWED_EXTENSIONS:
        return jsonify({"error":"Format file harus PNG, JPG, JPEG, WEBP, atau PDF"}), 400
    c = conn()
    order = c.execute("SELECT * FROM orders WHERE order_code=?", (order_code,)).fetchone()
    if not order:
        c.close()
        return jsonify({"error":"Nomor pesanan tidak ditemukan"}), 404
    ext = secure_filename(f.filename).rsplit(".",1)[1].lower()
    filename = f"{order_code}_{secrets.token_hex(8)}.{ext}"
    f.save(os.path.join(UPLOAD_DIR, filename))
    c.execute("UPDATE orders SET payment_proof=?, payment_status=? WHERE order_code=?",
              (filename, "Menunggu Verifikasi", order_code))
    c.commit(); c.close()
    return jsonify({"success":True, "message":"Bukti pembayaran berhasil diupload dan menunggu verifikasi admin."})

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.route("/api/track/<code>")
def track(code):
    c=conn()
    o=c.execute("SELECT * FROM orders WHERE order_code=?",(code.upper(),)).fetchone()
    if not o: c.close(); return jsonify({"error":"Pesanan tidak ditemukan"}),404
    items=c.execute("SELECT product_name,selected_option,qty,price FROM order_items WHERE order_id=?",(o["id"],)).fetchall()
    c.close()
    return jsonify({"order":dict(o),"items":[dict(i) for i in items]})

@app.route("/api/admin/login",methods=["POST"])
def login():
    d=request.get_json()
    if d.get("username")=="admin" and d.get("password")=="dear-nadiya-2026":
        session["admin"]=True; return jsonify({"success":True})
    return jsonify({"error":"Username atau password salah"}),401

@app.route("/api/admin/logout",methods=["POST"])
def logout(): session.clear(); return jsonify({"success":True})

@app.route("/api/admin/stats")
@admin_required
def stats():
    c=conn()
    total=c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    pending=c.execute("SELECT COUNT(*) FROM orders WHERE payment_status LIKE 'Menunggu%'").fetchone()[0]
    go=c.execute("SELECT COUNT(*) FROM products WHERE type='go' AND active=1").fetchone()[0]
    ready=c.execute("SELECT COALESCE(SUM(stock),0) FROM products WHERE type='ready' AND active=1").fetchone()[0]
    revenue=c.execute("SELECT COALESCE(SUM(amount_due),0) FROM orders WHERE payment_status!='Menunggu Pembayaran'").fetchone()[0]
    c.close()
    return jsonify({"total_orders":total,"pending":pending,"go":go,"ready_stock":ready,"revenue":revenue})

@app.route("/api/admin/orders")
@admin_required
def admin_orders():
    c=conn()
    rows=c.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
    result=[]
    for o in rows:
        d=dict(o)
        d["items"]=[dict(i) for i in c.execute("SELECT * FROM order_items WHERE order_id=?",(o["id"],)).fetchall()]
        d["payment_proof_url"] = url_for("uploaded_file", filename=d["payment_proof"]) if d.get("payment_proof") else None
        result.append(d)
    c.close(); return jsonify(result)

@app.route("/api/admin/orders/<int:oid>",methods=["PATCH"])
@admin_required
def update_order(oid):
    d=request.get_json()
    allowed={"payment_status","order_status"}
    fields=[]; vals=[]
    for k in allowed:
        if k in d: fields.append(k+"=?"); vals.append(d[k])
    if not fields: return jsonify({"error":"Tidak ada perubahan"}),400
    vals.append(oid)
    c=conn(); c.execute("UPDATE orders SET "+",".join(fields)+" WHERE id=?",vals); c.commit(); c.close()
    return jsonify({"success":True})

@app.route("/api/admin/products",methods=["POST"])
@admin_required
def add_product():
    d=request.get_json()
    c=conn()
    cur=c.execute("""INSERT INTO products(type,name,price,deadline,quota,stock,emoji,options,dp_allowed)
    VALUES(?,?,?,?,?,?,?,?,?)""",(d["type"],d["name"],int(d["price"]),d.get("deadline"),d.get("quota"),int(d.get("stock",0)),d.get("emoji","💗"),d.get("options","Random"),1 if d.get("dp_allowed") else 0))
    c.commit(); pid=cur.lastrowid; c.close()
    return jsonify({"success":True,"id":pid})

@app.route("/api/admin/products/<int:pid>",methods=["PATCH","DELETE"])
@admin_required
def product_admin(pid):
    c=conn()
    if request.method=="DELETE":
        c.execute("UPDATE products SET active=0 WHERE id=?",(pid,)); c.commit(); c.close(); return jsonify({"success":True})
    d=request.get_json(); keys=["name","price","deadline","quota","stock","emoji","options","dp_allowed","active"]
    fields=[]; vals=[]
    for k in keys:
        if k in d: fields.append(k+"=?"); vals.append(d[k])
    if fields: vals.append(pid); c.execute("UPDATE products SET "+",".join(fields)+" WHERE id=?",vals); c.commit()
    c.close(); return jsonify({"success":True})

init_db()
if __name__=="__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=os.environ.get("FLASK_DEBUG")=="1", host="0.0.0.0", port=port)
