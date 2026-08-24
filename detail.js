const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));

async function loadDetail(){
  const target = document.getElementById("detailPage");
  const id = new URLSearchParams(window.location.search).get("id");

  if(!id){
    target.innerHTML = "<h2>Produk tidak ditemukan</h2><p>Silakan kembali ke halaman utama.</p>";
    return;
  }

  try{
    const res = await fetch("/api/products");
    const products = await res.json();
    const p = products.find(x => String(x.id) === String(id));

    if(!p){
      target.innerHTML = "<h2>Produk tidak ditemukan</h2><p>Produk mungkin sudah tidak aktif.</p>";
      return;
    }

    const options = (p.options || "Random").split(",").map(x => x.trim()).filter(Boolean);

    target.innerHTML = `
      <span class="badge">${p.type === "go" ? "OPEN GO" : "READY STOCK"}</span>
      <h1>${p.name}</h1>
      <p class="eyebrow">${p.type === "go" ? "GROUP ORDER" : "AVAILABLE NOW"}</p>
      <div class="card" style="margin-top:20px">
        <div class="thumb">${p.emoji || "💗"}</div>
        <h3>Harga: ${rupiah(p.price)}</h3>
        ${p.description ? `<p>${p.description}</p>` : ""}
        ${p.type === "go" ? `
          <p><b>Deadline:</b> ${p.deadline || "-"}</p>
          <p><b>Kuota:</b> ${p.quota || "-"}</p>
        ` : `
          <p><b>Stok tersedia:</b> ${p.stock ?? 0}</p>
        `}
        <label><b>Pilih versi/member</b></label>
        <div class="options" id="opts">
          ${options.map((x,i)=>`<button class="option ${i===0 ? "active" : ""}" onclick="selectOption(this)">${x}</button>`).join("")}
        </div>
        <div class="qty">
          <span>Jumlah</span>
          <button onclick="changeQty(-1)">−</button>
          <b id="qty">1</b>
          <button onclick="changeQty(1)">+</button>
        </div>
        <button class="btn primary" onclick="addToCart(${p.id})">Masukkan Keranjang</button>
      </div>
    `;
  }catch(e){
    target.innerHTML = "<h2>Gagal memuat detail</h2><p>Silakan coba lagi.</p>";
  }
}

function selectOption(el){
  document.querySelectorAll("#opts .option").forEach(x => x.classList.remove("active"));
  el.classList.add("active");
}

function changeQty(n){
  const el = document.getElementById("qty");
  el.textContent = Math.max(1, Number(el.textContent) + n);
}

function addToCart(id){
  const selected = document.querySelector("#opts .active");
  const item = {
    product_id: id,
    qty: Number(document.getElementById("qty").textContent),
    selected_option: selected ? selected.textContent : "Random"
  };

  const cart = JSON.parse(localStorage.getItem("dearNadiyaCart") || "[]");
  cart.push(item);
  localStorage.setItem("dearNadiyaCart", JSON.stringify(cart));
  alert("Produk berhasil dimasukkan ke keranjang.");
  window.location.href = "/";
}

loadDetail();
