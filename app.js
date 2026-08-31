// ==========================================
// DEAR NADIYA - MEMBER PORTAL
// ==========================================

const money = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};


// ==========================================
// LOAD MEMBER
// ==========================================

async function loadMember() {

  try {

    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {

      alert("User belum login ke Supabase.");

      return;
    }


    console.log("USER LOGIN:", user.id);


    // Cari member berdasarkan ID Auth
    const { data: member, error } =
      await supabaseClient
        .from("dn_members")
        .select("*")
        .eq("id", user.id)
        .single();


    if (error) {
      throw error;
    }


    console.log("MEMBER:", member);


    // Ubah sapaan
    const heroTitle =
      document.querySelector(".hero h1");

    if (heroTitle) {

      heroTitle.innerHTML =
        `Halo, ${member.name || "Member"} <span>Dear Nadiya ♥</span>`;

    }


    // Ambil PO member
    await loadMyPO(member.id);

  } catch (error) {

    console.error("Gagal memuat member:", error);

  }

}



// ==========================================
// LOAD PO MEMBER
// ==========================================

async function loadMyPO(memberId) {

  try {

    const { data, error } =
      await supabaseClient
        .from("dn_po_members")
        .select(`
          po_id,
          joined_at,
          dn_pos (
            id,
            name,
            description,
            image_url,
            open_date,
            close_date,
            last_dp,
            status,
            created_at
          )
        `)
        .eq("member_id", memberId);


    if (error) {
      throw error;
    }


    console.log("PO MEMBER:", data);


    const poList =
      document.getElementById("poList");


    if (!data || data.length === 0) {

      poList.innerHTML = `
        <div class="panel">

          <h3>Belum ada PO</h3>

          <p>
            Kamu belum mengikuti Pre-Order apa pun.
          </p>

        </div>
      `;

      updateSummary([]);

      return;
    }


    // Tampilkan PO
    poList.innerHTML = data.map(item => {

      const po = item.dn_pos;

      return `

        <div class="panel po-card">

          ${
            po.image_url
              ? `
                <img
                  src="${po.image_url}"
                  alt="${po.name}"
                  style="
                    width:100%;
                    max-height:220px;
                    object-fit:cover;
                    border-radius:16px;
                    margin-bottom:15px;
                  "
                >
              `
              : ""
          }


          <p class="eyebrow">
            GROUP ORDER
          </p>


          <h3>
            ${po.name || "-"}
          </h3>


          <p>
            ${po.description || ""}
          </p>


          <div class="po-info">

            <p>
              <b>Open PO</b><br>
              ${formatDate(po.open_date)}
            </p>


            <p>
              <b>Close PO</b><br>
              ${formatDate(po.close_date)}
            </p>


            <p>
              <b>Last DP</b><br>
              ${formatDate(po.last_dp)}
            </p>


            <p>
              <b>Status</b><br>
              <span class="badge">
                ${po.status || "OPEN"}
              </span>
            </p>

          </div>

        </div>

      `;

    }).join("");


    updateSummary(data);

  } catch (error) {

    console.error("Gagal memuat PO:", error);

    document.getElementById("poList").innerHTML = `
      <div class="panel">

        <h3>Gagal memuat PO</h3>

        <p>
          ${error.message}
        </p>

      </div>
    `;

  }

}



// ==========================================
// SUMMARY
// ==========================================

function updateSummary(data) {

  const activePO = data.length;


  const panels =
    document.querySelectorAll("main > section:first-child .panel h2");


  if (panels.length >= 1) {

    panels[0].textContent =
      activePO;

  }

}



// ==========================================
// FORMAT TANGGAL
// ==========================================

function formatDate(date) {

  if (!date) {
    return "-";
  }


  const d = new Date(date);


  if (isNaN(d.getTime())) {
    return date;
  }


  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

}



// ==========================================
// START
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadMember();

  }
);
