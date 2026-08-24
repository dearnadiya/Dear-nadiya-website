// ========================================
// CONFIG
// ========================================

const $ = (q) => document.querySelector(q);

const fmt = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);


// ========================================
// SUPABASE
// ========================================

// URL PROJECT SUPABASE
// JANGAN tambahkan /rest/v1 di sini
const SUPABASE_URL = "https://cwwzsbqfznzwfclajwnw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ADa_gyMfyBZ1ZcdUO8FRfw_iELzOmbQ";

const SUPABASE_REST =
  `${SUPABASE_URL}/rest/v1`;


// ========================================
// HELPER SUPABASE
// ========================================

async function dbRequest(
  table,
  method = "GET",
  query = "",
  body = null
) {
  const url =
    `${SUPABASE_REST}/${table}${query}`;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };

  if (body !== null) {
    headers["Content-Type"] =
      "application/json";

    headers["Prefer"] =
      "return=representation";
  }

  const response = await fetch(url, {
    method,
    headers,
    body:
      body !== null
        ? JSON.stringify(body)
        : undefined
  });

  const text =
    await response.text();

  let result = null;

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = text;
    }
  }

  if (!response.ok) {
    console.error(
      "Supabase error:",
      result
    );

    throw new Error(
      result?.message ||
      result?.hint ||
      result?.details ||
      "Terjadi kesalahan Supabase"
    );
  }

  return result;
}


// ========================================
// LOGIN
// ========================================

async function login() {

  const username =
    document
      .getElementById("u")
      .value
      .trim();

  const password =
    document
      .getElementById("p")
      .value;


  if (!username || !password) {

    alert(
      "Masukkan username dan password"
    );

    return;
  }


  try {

    const result =
      await dbRequest(
        "admin_users",
        "GET",
        `?username=eq.${encodeURIComponent(username)}` +
        `&password=eq.${encodeURIComponent(password)}` +
        "&select=*"
      );


    if (!result || result.length === 0) {

      alert(
        "Username atau password salah"
      );

      return;
    }


    // SIMPAN STATUS LOGIN

    localStorage.setItem(
      "adminLoggedIn",
      "true"
    );


    document
      .getElementById("login")
      .classList
      .add("hidden");


    document
      .getElementById("app")
      .classList
      .remove("hidden");


    page("dash");

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    alert(
      "Login gagal: " +
      error.message
    );
  }
}


// ========================================
// CEK LOGIN SAAT HALAMAN DIBUKA
// ========================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const loggedIn =
      localStorage.getItem(
        "adminLoggedIn"
      );


    if (loggedIn === "true") {

      document
        .getElementById("login")
        .classList
        .add("hidden");


      document
        .getElementById("app")
        .classList
        .remove("hidden");


      page("dash");

    }

  }
);


// ========================================
// LOGOUT
// ========================================

function logout() {

  localStorage.removeItem(
    "adminLoggedIn"
  );


  document
    .getElementById("app")
    .classList
    .add("hidden");


  document
    .getElementById("login")
    .classList
    .remove("hidden");


  document
    .getElementById("u")
    .value = "";


  document
    .getElementById("p")
    .value = "";


  alert("Berhasil keluar");
}


// ========================================
// NAVIGASI
// ========================================

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


// ========================================
// DASHBOARD
// ========================================

async function dash() {

  $("#title").textContent =
    "Dashboard";


  $("#content").innerHTML =
    "<p>Memuat dashboard...</p>";


  try {

    const productList =
      await dbRequest(
        "products",
        "GET",
        "?select=*"
      );


    const orderList =
      await dbRequest(
        "orders",
        "GET",
        "?select=*"
      );


    const products =
      productList || [];


    const orders =
      orderList || [];


    const totalOrders =
      orders.length;


    const go =
      products.filter(
        p => p.type === "go"
      ).length;


    const readyStock =
      products
        .filter(
          p => p.type === "ready"
        )
        .reduce(
          (total, p) =>
            total +
            (Number(p.stock) || 0),
          0
        );


    const pending =
      orders.filter(
        o =>
          o.payment_status ===
            "Menunggu Pembayaran" ||

          o.payment_status ===
            "Pending" ||

          o.payment_status ===
            "Belum Dibayar"
      ).length;


    const revenue =
      orders
        .filter(
          o =>
            o.payment_status ===
            "Pembayaran Diterima"
        )
        .reduce(
          (total, o) =>
            total +
            (Number(o.total) || 0),
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

        <h2>
          Pendapatan Terverifikasi
        </h2>

        <h1 style="color:#e66f9f">
          ${fmt(revenue)}
        </h1>

      </section>

    `;

  } catch (error) {

    console.error(error);

    $("#content").innerHTML =
      `<p>Gagal memuat dashboard: ${error.message}</p>`;

  }

}


// ========================================
// PRODUK
// ========================================

async function products() {

  $("#title").textContent =
    "Produk & GO";


  $("#content").innerHTML =
    "<p>Memuat produk...</p>";


  try {

    const ps =
      await dbRequest(
        "products",
        "GET",
        "?select=*&order=id.desc"
      );


    $("#content").innerHTML = `

      <section class="panel">

        <h2>
          Tambah Produk / GO
        </h2>

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
            placeholder="Emoji"
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
            placeholder="Pilihan"
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


          <button
            type="submit"
            class="btn"
          >
            Tambah Produk
          </button>

        </form>

      </section>


      <section class="panel">

        <h2>
          Produk Aktif
        </h2>

        ${ps.length === 0
          ? "<p>Belum ada produk.</p>"
          : ps.map(
              p => `

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
                  ${p.type === "go"
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

            `
            ).join("")
        }

      </section>

    `;

  } catch (error) {

    console.error(error);

    $("#content").innerHTML =
      `<p>Gagal memuat produk: ${error.message}</p>`;

  }

}


// ========================================
// TAMBAH PRODUK
// ========================================

async function addProduct(e) {

  e.preventDefault();


  const form =
    e.target;


  const formData =
    new FormData(form);


  const d =
    Object.fromEntries(
      formData.entries()
    );


  d.price =
    Number(d.price) || 0;


  d.stock =
    Number(d.stock) || 0;


  d.quota =
    Number(d.quota) || 0;


  d.dp_allowed =
    d.dp_allowed === "true";


  try {

    await dbRequest(
      "products",
      "POST",
      "",
      d
    );


    alert(
      "Produk berhasil ditambahkan"
    );


    form.reset();


    products();

  } catch (error) {

    alert(
      "Gagal menambahkan produk: " +
      error.message
    );

  }

}


// ========================================
// HAPUS PRODUK
// ========================================

async function archive(id) {

  const yakin =
    confirm(
      "Yakin ingin menghapus produk ini?"
    );


  if (!yakin) return;


  try {

    await dbRequest(
      "products",
      "DELETE",
      `?id=eq.${id}`
    );


    alert(
      "Produk berhasil dihapus"
    );


    products();

  } catch (error) {

    alert(
      "Gagal menghapus produk: " +
      error.message
    );

  }

}


// ========================================
// PESANAN
// ========================================

async function orders() {

  $("#title").textContent =
    "Pesanan";


  $("#content").innerHTML =
    "<p>Memuat pesanan...</p>";


  try {

    const os =
      await dbRequest(
        "orders",
        "GET",
        "?select=*&order=id.desc"
      );


    $("#content").innerHTML = `

      <section class="panel">

        <table>

          <thead>

            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>

          </thead>


          <tbody>

            ${os.map(
              o => `

              <tr>

                <td>
                  ${o.order_code || "-"}
                </td>

                <td>
                  ${o.customer_name || "-"}
                </td>

                <td>
                  ${fmt(o.total)}
                </td>

                <td>
                  ${o.payment_status || "-"}
                </td>

                <td>
                  ${o.order_status || "-"}
                </td>

                <td>

                  <button
                    onclick="setStatus(
                      ${o.id},
                      'Pesanan Diproses'
                    )"
                  >
                    Proses
                  </button>

                </td>

              </tr>

            `
            ).join("")}

          </tbody>

        </table>

      </section>

    `;

  } catch (error) {

    console.error(error);

    $("#content").innerHTML =
      `<p>Gagal memuat pesanan: ${error.message}</p>`;

  }

}


// ========================================
// UBAH STATUS PESANAN
// ========================================

async function setStatus(
  id,
  status
) {

  try {

    await dbRequest(
      "orders",
      "PATCH",
      `?id=eq.${id}`,
      {
        order_status: status
      }
    );


    orders();

  } catch (error) {

    alert(
      "Gagal mengubah status: " +
      error.message
    );

  }

}


// ========================================
// PEMBAYARAN
// ========================================

async function payments() {

  $("#title").textContent =
    "Pembayaran";


  $("#content").innerHTML =
    "<p>Memuat pembayaran...</p>";


  try {

    const os =
      await dbRequest(
        "orders",
        "GET",
        "?select=*&order=id.desc"
      );


    $("#content").innerHTML = `

      <section class="panel">

        <h2>
          Verifikasi Bukti Pembayaran
        </h2>

        <table>

          <thead>

            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Nominal</th>
              <th>Bukti</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>

          </thead>


          <tbody>

            ${os.map(
              o => `

              <tr>

                <td>
                  ${o.order_code || "-"}
                </td>

                <td>
                  ${o.customer_name || "-"}
                </td>

                <td>
                  ${fmt(
                    o.amount_due || o.total
                  )}
                </td>

                <td>

                  ${o.payment_proof_url
                    ? `
                      <a
                        href="${o.payment_proof_url}"
                        target="_blank"
                      >
                        Lihat Bukti
                      </a>
                    `
                    : "Belum upload"
                  }

                </td>

                <td>
                  ${o.payment_status || "-"}
                </td>

                <td>

                  ${
                    o.payment_proof_url &&
                    o.payment_status !==
                      "Pembayaran Diterima"

                      ? `
                        <button
                          class="btn"
                          onclick="verify(${o.id})"
                        >
                          Verifikasi
                        </button>
                      `

                      : "-"
                  }

                </td>

              </tr>

            `
            ).join("")}

          </tbody>

        </table>

      </section>

    `;

  } catch (error) {

    console.error(error);

    $("#content").innerHTML =
      `<p>Gagal memuat pembayaran: ${error.message}</p>`;

  }

}


// ========================================
// VERIFIKASI PEMBAYARAN
// ========================================

async function verify(id) {

  const yakin =
    confirm(
      "Yakin ingin memverifikasi pembayaran ini?"
    );


  if (!yakin) return;


  try {

    await dbRequest(
      "orders",
      "PATCH",
      `?id=eq.${id}`,
      {
        payment_status:
          "Pembayaran Diterima"
      }
    );


    alert(
      "Pembayaran berhasil diverifikasi"
    );


    payments();

  } catch (error) {

    alert(
      "Gagal memverifikasi pembayaran: " +
      error.message
    );

  }

}


// ========================================
// REKAP GO
// ========================================

function recap() {

  $("#title").textContent =
    "Rekap GO";


  $("#content").innerHTML = `

    <section class="panel">

      <h2>
        📈 Rekap Group Order
      </h2>

      <p>
        Rekap seluruh data pembelian
        GO Dear Nadiya.
      </p>


      <button
        class="btn"
        onclick="window.open(
          'https://docs.google.com/spreadsheets/d/17iLspFRuewGhVZXLl6RaPD3orjSAdHB9BfkmamlXJeY/edit?usp=drivesdk',
          '_blank'
        )"
      >
        📊 Buka Rekap GO
      </button>

    </section>

  `;

}
