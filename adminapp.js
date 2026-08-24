const $ = q => document.querySelector(q);

const fmt = n =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);


// ===============================
// KONFIGURASI SUPABASE
// ===============================

const SUPABASE_URL = "https://cwwzsbqfznzwfclajwnw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ADa_gyMfyBZ1ZcdUO8FRfw_iELzOmbQ";


// ===============================
// HELPER SUPABASE
// ===============================

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.text();

    console.error("Supabase Error:", error);

    throw new Error(
      `Gagal mengambil data (${response.status})`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}


// ===============================
// LOGIN
// ===============================

function login() {
  const username = document.getElementById("u").value;
  const password = document.getElementById("p").value;

  if (
    username === "admin" &&
    password === "dear-nadiya-2026"
  ) {
    document
      .getElementById("login")
      .classList.add("hidden");

    document
      .getElementById("app")
      .classList.remove("hidden");

    page("dash");

  } else {
    alert("Username atau password salah");
  }
}


// ===============================
// LOGOUT
// ===============================

function logout() {
  document
    .getElementById("app")
    .classList.add("hidden");

  document
    .getElementById("login")
    .classList.remove("hidden");

  document.getElementById("u").value = "";
  document.getElementById("p").value = "";

  alert("Berhasil keluar");
}


// ===============================
// NAVIGASI HALAMAN
// ===============================

function page(p) {
  const pages = {
    dash,
    products,
    orders,
    payments,
    recap
  };

  if (pages[p]) {
    pages[p]();
  }
}


// ===============================
// DASHBOARD
// ===============================

async function dash() {
  $("#title").textContent = "Dashboard";

  $("#content").innerHTML =
    `<p>Memuat dashboard...</p>`;

  try {

    const products = await supabase(
      "products?select=*"
    );

    const orderList = await supabase(
      "orders?select=*"
    );

    const totalOrders = orderList.length;

    const go = products.filter(
      p => p.type === "go"
    ).length;

    const readyStock = products.filter(
      p => p.type === "ready"
    ).length;

    const pending = orderList.filter(
      o =>
        o.payment_status === "Menunggu Pembayaran" ||
        o.payment_status === "Pending" ||
        o.payment_status === "Belum Dibayar"
    ).length;

    const revenue = orderList
      .filter(
        o =>
          o.payment_status ===
          "Pembayaran Diterima"
      )
      .reduce(
        (total, o) =>
          total + (Number(o.total) || 0),
        0
      );

    $("#content").innerHTML = `

      <div class="cards">

        <div class="stat">
          🧾
          <p>Total Pesanan</p>
          <h2>${totalOrders}</h2>
        </div>

        <div class="stat">
          🛍️
          <p>GO Aktif</p>
          <h2>${go}</h2>
        </div>

        <div class="stat">
          💳
          <p>Menunggu Pembayaran</p>
          <h2>${pending}</h2>
        </div>

        <div class="stat">
          📦
          <p>Total Ready Stock</p>
          <h2>${readyStock}</h2>
        </div>

      </div>

      <section class="panel">
        <h2>Pendapatan Terverifikasi</h2>

        <h1 style="color:#e66f9f">
          ${fmt(revenue)}
        </h1>
      </section>

    `;

  } catch (error) {

    console.error(error);

    $("#content").innerHTML =
      `<p>Gagal memuat dashboard.</p>`;

  }
}


// ===============================
// PRODUK
// ===============================

async function products() {

  $("#title").textContent =
    "Produk & GO";

  $("#content").innerHTML =
    `<p>Memuat produk...</p>`;

  try {

    const ps = await supabase(
      "products?select=*&order=id.desc"
    );

    $("#content").innerHTML = `

      <section class="panel">

        <h2>Tambah Produk / GO</h2>

        <form
          class="form"
          onsubmit="addProduct(event)"
        >

          <select name="type">

            <option value="go">
              GO
            </option>

            <option value="ready">
              Ready Stock
            </option>

          </select>


          <input
            name="emoji"
            placeholder="Emoji contoh: 💿"
            value="💿"
          >


          <input
            name="name"
            placeholder="Nama produk"
            required
          >


          <input
            name="price"
            type="number"
            placeholder="Harga"
            required
          >


          <input
            name="stock"
            type="number"
            placeholder="Stok Ready Stock"
          >


          <input
            name="deadline"
            placeholder="Deadline GO"
          >


          <input
            name="quota"
            type="number"
            placeholder="Kuota GO"
          >


          <input
            name="options"
            placeholder="Pilihan: Random,Member"
            value="Random"
          >


          <select name="dp_allowed">

            <option value="false">
              Tidak ada DP
            </option>

            <option value="true">
              DP diizinkan
            </option>

          </select>


          <button class="btn">
            Tambah Produk
          </button>

        </form>

      </section>


      <section class="panel">

        <h2>Produk Aktif</h2>

        ${
          ps.length
            ? ps.map(p => `

              <div class="product">

                <h3>
                  ${p.emoji || "📦"}
                  ${p.name}
                </h3>

                <p>
                  ${p.type === "go"
                    ? "OPEN GO"
                    : "READY STOCK"}
                  •
                  ${fmt(p.price)}
                </p>

                <p>

                  ${
                    p.type === "go"
                      ? `Deadline: ${p.deadline || "-"}`
                      : `Stok: ${p.stock || 0}`
                  }

                </p>

                <div class="actions">

                  <button
                    onclick="archive(${p.id})"
                  >
                    Hapus Produk
                  </button>

                </div>

              </div>

            `).join("")
