// ===============================
// ALL THE DATA
// ===============================

let records = JSON.parse(localStorage.getItem("campusRecords")) || [];
let editingId = null;
let currentUnit = "hours"; // default unit for display



// ===============================
// NAVIGATION (Show/Hide Sections)
// ===============================

const navLinks = document.querySelectorAll(".nav-list a");
const sections = document.querySelectorAll("main section");

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const targetId = link.getAttribute("href").substring(1);

    sections.forEach(section => section.hidden = true);
    document.getElementById(targetId).hidden = false;
  });
});

// ===============================
// SAVING TO LOCAL STORAGE
// ===============================

function saveToStorage() {
  localStorage.setItem("campusRecords", JSON.stringify(records));
}

// ===============================
// ADDING / EDITING TASKS
// ===============================

const form = document.getElementById("taskForm");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const date = document.getElementById("date").value;
  const duration = parseFloat(document.getElementById("duration").value) || 0;
  const tag = document.getElementById("tag").value.trim();
  const status = document.getElementById("status").value;
  const error = document.getElementById("formError");

  // Basic validation
  if (!title || !date) {
    error.textContent = "Title and Date are required.";
    return;
  }

  error.textContent = "";

  if (editingId) {
    // EDIT MODE
    const record = records.find(r => r.id === editingId);
    record.title = title;
    record.date = date;
    record.duration = duration;
    record.tag = tag;
    record.status = status;
    record.updatedAt = new Date().toISOString();
    editingId = null;
  } else {
    // ADD MODE
    const newRecord = {
      id: "rec_" + Date.now(),
      title,
      date,
      duration,
      tag,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.push(newRecord);
  }

  saveToStorage();
  renderTable();
  updateDashboard();
  form.reset();
});

// ===============================
// RENDER TABLE
// ===============================

function renderTable(data = records) {
  const tbody = document.getElementById("recordsTableBody");
  tbody.innerHTML = "";

  data.forEach(record => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${record.title}</td>
      <td>${record.date}</td>
      <td>${record.duration}</td>
      <td>${record.tag}</td>
      <td>${record.status}</td>
      <td>
        <button onclick="editRecord('${record.id}')">Edit</button>
        <button onclick="deleteRecord('${record.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// ===============================
// EDITING RECORDS
// ===============================

window.editRecord = function (id) {
  const record = records.find(r => r.id === id);

  document.getElementById("title").value = record.title;
  document.getElementById("date").value = record.date;
  document.getElementById("duration").value = record.duration;
  document.getElementById("tag").value = record.tag;
  document.getElementById("status").value = record.status;

  editingId = id;

  // Switch to Add section
  sections.forEach(section => section.hidden = true);
  document.getElementById("add").hidden = false;
};

// ===============================
// DELETING RECORDS
// ===============================

window.deleteRecord = function (id) {
  if (!confirm("Are you sure you want to delete this record? Pres Ok toproceed.")) return;

  records = records.filter(r => r.id !== id);
  saveToStorage();
  renderTable();
  updateDashboard();

  document.getElementById("statusMessage").textContent = "Record deleted.";
};

// ===============================
// SEARCH (REGEX)
// ===============================

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", function () {
  const pattern = searchInput.value;

  try {
    const regex = new RegExp(pattern, "i");

    const filtered = records.filter(record =>
      regex.test(record.title) ||
      regex.test(record.tag) ||
      regex.test(record.date)
    );

    renderTable(filtered);

    document.getElementById("statusMessage").textContent =
      filtered.length + " result(s) found.";

  } catch (error) {
    document.getElementById("statusMessage").textContent =
      "Invalid regex pattern.";
  }
});

// ===============================
// SORTING
// ===============================

const sortSelect = document.getElementById("sortSelect");

if (sortSelect) {
  sortSelect.addEventListener("change", function () {
    const type = sortSelect.value;

    let sorted = [...records];

    if (type === "date") {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (type === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (type === "duration") {
      sorted.sort((a, b) => a.duration - b.duration);
    }

    renderTable(sorted);
  });
}

// ===============================
// DASHBOARD STATS
// ===============================

function updateDashboard() {
  const totalRecords = records.length;

  const totalDuration = records.reduce(
    (sum, r) => sum + r.duration,
    0
  );

  const completed = records.filter(r => r.status === "completed").length;
  const completionRate = totalRecords
    ? Math.round((completed / totalRecords) * 100)
    : 0;

  const tagCount = {};
  records.forEach(r => {
    if (!r.tag) return;
    tagCount[r.tag] = (tagCount[r.tag] || 0) + 1;
  });

  const topTag = Object.keys(tagCount).sort(
    (a, b) => tagCount[b] - tagCount[a]
  )[0] || "None";

  document.getElementById("totalRecords").textContent = totalRecords;
  document.getElementById("totalDuration").textContent = totalDuration;
  document.getElementById("topTag").textContent = topTag;

  const rateElement = document.getElementById("completionRate");
  if (rateElement) {
    rateElement.textContent = completionRate + "%";
  }

  checkWeeklyTarget(totalDuration);
}

// ===============================
// WEEKLY TARGET (ARIA LIVE)
// ===============================

const weeklyCapInput = document.getElementById("weeklyCap");

if (weeklyCapInput) {
  weeklyCapInput.addEventListener("input", function () {
    checkWeeklyTarget(
      records.reduce((sum, r) => sum + r.duration, 0)
    );
  });
}

function checkWeeklyTarget(totalHours) {
  const cap = parseFloat(weeklyCapInput.value);
  const live = document.getElementById("liveMessage");

  if (!cap) return;

  const remaining = cap - totalHours;

  if (remaining >= 0) {
    live.setAttribute("aria-live", "polite");
    live.textContent = remaining + " hours remaining.";
  } else {
    live.setAttribute("aria-live", "assertive");
    live.textContent =
      "Target exceeded by " + Math.abs(remaining) + " hours.";
  }
}
//================================
// IMPORTING/EXPORTING JSON
//===================================

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

// EXPORT
if (exportBtn) {
  exportBtn.addEventListener("click", () => {

    const dataStr = JSON.stringify(records, null, 2);

    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "records.json";
    a.click();

    URL.revokeObjectURL(url);
  });
}

// IMPORT
if (importBtn && importFile) {

  importBtn.addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", (event) => {

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);

        if (!Array.isArray(importedData)) {
          alert("Invalid JSON format.");
          return;
        }

        records = importedData;
        saveToStorage();
        renderTable();
        updateDashboard();

        alert("Data imported successfully!");

      } catch (error) {
        alert("Invalid JSON file.");
      }
    };

    reader.readAsText(file);
  });
}

// ===============================
// INITIAL LOAD
// ===============================

renderTable();
updateDashboard();

