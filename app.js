let products = [], cart = [];

const rupiah = n => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
}).format(n);

const SUPABASE_URL = "https://cwwzsbqfznzwfclajwnw.supabase.co";
const SUPABASE_KEY = "sb_publishable_ADa_gyMfyBZ1ZcdUO8FRfw_iELzOmbQ";

async function load(){
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        products = await response.json();
        console.log("Products:", products);
        render();
    } catch (error) {
        console.error("Gagal memuat produk:", error);
        alert("Produk gagal dimuat: " + error.message);
    }
}
function render(){const card=p=>`<article class="card"><div class="thumb">${p.emoji}</div><span class="badge">${p.type==="go"?"OPEN GO":"READY STOCK"}</span><h3>${p.name}</h3><p><b>${rupiah(p.price)}</b></p><p>${p.type==="go"?`Deadline: ${p.deadline}<br>Kuota: ${p.quota}`:`Stok: ${p.stock}`}</p><button class="btn secondary" onclick="window.location.href='/detail.html?id=${p.id}'">Lihat Detail</button></article>`;document.getElementById("goGrid").innerHTML=products.filter(x=>x.type==="go").map(card).join("");document.getElementById("readyGrid").innerHTML=products.filter(x=>x.type==="ready").map(card).join("");}
function detail(id) {
  window.location.href = "./detail.html?id=" + id;
}
function selectOpt(e){document.querySelectorAll("#opts .option").forEach(x=>x.classList.remove("active"));e.classList.add("active")}
function qty(n){let e=document.getElementById("qty"),v=Math.max(1,+e.textContent+n);e.textContent=v}
function add(id){const p=products.find(x=>x.id===id);cart.push({product_id:id,name:p.name,price:p.price,qty:+document.getElementById("qty").textContent,selected_option:document.querySelector("#opts .active").textContent,dp_allowed:p.dp_allowed});document.getElementById("count").textContent=cart.reduce((a,b)=>a+b.qty,0);closeModal();alert("Masuk keranjang ♥")}
function openCart(){if(!cart.length){alert("Keranjang masih kosong.");return}let total=cart.reduce((a,b)=>a+b.price*b.qty,0);document.getElementById("modalBody").innerHTML=`<h2>Keranjang</h2>${cart.map((x,i)=>`<div class="cartline"><span><b>${x.name}</b><br>${x.selected_option} × ${x.qty}</span><b>${rupiah(x.price*x.qty)}</b></div>`).join("")}<h3>Total: ${rupiah(total)}</h3><button class="btn primary" onclick="checkout()">Checkout</button>`;openModal()}
function checkout(){document.getElementById("modalBody").innerHTML=`<h2>Checkout</h2><form class="form" onsubmit="submitOrder(event)"><label>Nama lengkap<input required name="customer_name"></label><label>WhatsApp<input required name="whatsapp"></label><label>Instagram<input name="instagram"></label><label>Alamat lengkap<textarea required name="address"></textarea></label><label>Pembayaran</label><div class="pay"><label><input type="radio" name="payment_type" value="dp" checked> DP 50% (jika tersedia)</label><label><input type="radio" name="payment_type" value="full"> Lunas</label></div><button class="btn primary">Buat Pesanan</button></form>`}
async function submitOrder(e){e.preventDefault();let f=new FormData(e.target),d=Object.fromEntries(f.entries());d.items=cart;let r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}),j=await r.json();if(j.error){alert(j.error);return}cart=[];document.getElementById("count").textContent=0;document.getElementById("modalBody").innerHTML=`<div class="result"><h3>Pesanan berhasil dibuat ♥</h3><p>Nomor pesanan: <b>${j.order_code}</b></p><p>Total pembayaran saat ini: <b>${rupiah(j.amount_due)}</b></p><p>Silakan transfer sesuai rekening yang ditentukan admin, lalu lakukan upload bukti pembayaran pada versi lanjutan.</p></div>`}
async function track(){
 let c=document.getElementById("trackCode").value.trim(),r=await fetch("/api/track/"+encodeURIComponent(c)),j=await r.json(),out=document.getElementById("trackResult");
 if(j.error){out.innerHTML=`<p>${j.error}</p>`;return}
 const canUpload=!j.order.payment_proof;
 out.innerHTML=`<div class="result"><b>${j.order.order_code}</b><br>Pembayaran: ${j.order.payment_status}<br>Status: ${j.order.order_status}<br>Total: ${rupiah(j.order.total)}<br>Yang perlu dibayar: <b>${rupiah(j.order.amount_due)}</b>${j.order.payment_proof?`<br><br>📎 Bukti pembayaran sudah diterima dan ${j.order.payment_status.toLowerCase()}.`:``}</div>
 ${canUpload?`<div class="uploadbox"><h3>Upload Bukti Pembayaran</h3><p>Format: JPG, JPEG, PNG, WEBP, atau PDF. Maks. 8 MB.</p><input id="proofFile" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"><button class="btn primary" onclick="uploadProof('${j.order.order_code}')">Upload Bukti Pembayaran</button></div>`:``}`;
}
async function uploadProof(code){
 const f=document.getElementById("proofFile").files[0];
 if(!f){alert("Pilih file bukti pembayaran terlebih dahulu.");return}
 const fd=new FormData();fd.append("proof",f);
 const r=await fetch("/api/payment-proof/"+encodeURIComponent(code),{method:"POST",body:fd});
 const j=await r.json();
 if(j.error){alert(j.error);return}
 alert(j.message);
document.getElementById("trackCode").value = code;
track();
}

function openModal(){
  document.getElementById("modal").classList.add("show");
}

function closeModal(){
  document.getElementById("modal").classList.remove("show");
}
load();
