// main.js (ฉบับอัปเกรด)

// --- 1. Global Storage ---
// (ที่เก็บ Config กลาง)
let droneConfig = null;

// --- 2. Helper Function: โหลด Config (ใช้ซ้ำได้) ---
async function loadConfig() {
  // ถ้าเคยโหลดแล้ว ไม่ต้องโหลดซ้ำ
  if (droneConfig) {
    return droneConfig;
  }

  // (นี่คือตรรกะจาก Page #1 เดิม)
  const url = `${API_URL}/configs/${DRONE_ID}`;
  console.log(`Fetching config from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    
    // "จำ" Config ไว้ใน Global Storage
    droneConfig = config; 
    return config;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    // ส่งต่อ Error ให้ที่เรียกใช้ (Page 1, Page 2) ไปจัดการ
    throw error; 
  }
}

// --- 3. Page Logic (ดูว่าเราอยู่หน้าไหน) ---
const path = window.location.pathname;

// --- Logic for Page #1 (index.html) ---
if (path.endsWith('/') || path.endsWith('index2.html')) {
  
  // เรียกฟังก์ชันโหลด Config
  loadConfig()
    .then(config => {
      // (เหมือนเดิม) เอาข้อมูลไปยัดใส่ HTML
      document.getElementById('drone-id-display').textContent = config.drone_id;
      document.getElementById('drone-name').textContent = config.drone_name;
      document.getElementById('light').textContent = config.light;
      document.getElementById('country').textContent = config.country;
    })
    .catch(error => {
      // (เหมือนเดิม) ถ้า Error
      document.getElementById('config-data').innerHTML = 
        '<p style="color: red;">Error loading config.</p>';
    });
}

// --- Logic for Page #2 (form.html) ---
if (path.endsWith('form.html')) {
  // 1. หา Element ที่จำเป็น
  const form = document.getElementById('log-form');
  const statusMsg = document.getElementById('status-message');
  
  // 2. (⭐️ ตรรกะใหม่) เมื่อหน้าโหลด: โหลด Config ก่อน
  loadConfig()
    .then(config => {
      // (ตามที่คุณบอก) โหลดเสร็จแล้ว -> บอก User
      statusMsg.textContent = `Ready to log for: ${config.drone_name}`;
      // (⭐️ โค้ดใหม่) แสดงฟอร์มที่ซ่อนไว้
      form.style.display = 'block'; 
    })
    .catch(error => {
      // ถ้าโหลด Config ไม่ผ่าน (เช่น Ass#1 ปิดอยู่)
      statusMsg.innerHTML = '<p style="color: red;">Error loading config. Cannot submit log. Please check API server (Ass#1).</p>';
    });

  // 3. ดักฟังการ Submit (เหมือนเดิม)
  form.addEventListener('submit', handleLogSubmit);
}

// --- ฟังก์ชันสำหรับ Submit (Page #2) ---
async function handleLogSubmit(event) {
  event.preventDefault(); // กันหน้ารีเฟรช
  
  const statusMsg = document.getElementById('status-message');
  const submitButton = document.querySelector('#log-form button');
  
  // ปิดปุ่มกัน User กดซ้ำ
  submitButton.disabled = true;
  statusMsg.textContent = 'Submitting...';

  // 1. ดึงค่า Celsius จากฟอร์ม
  const celsius = parseFloat(document.getElementById('celsius-input').value);

  // 2. (⭐️ ตรรกะใหม่) ดึง Config (Primitivo, Nigeria) จาก Global Storage
  if (!droneConfig) {
     statusMsg.innerHTML = '<p style="color: red;">Error: Config data is missing. Cannot submit.</p>';
     submitButton.disabled = false;
     return;
  }

  // 3. "แพ็ค" ข้อมูล 4 field (สำหรับ Backend "Basic")
  const logData = {
    drone_id: droneConfig.drone_id,
    drone_name: droneConfig.drone_name,
    country: droneConfig.country,
    celsius: celsius
  };

  // 4. ยิง POST ไปหา Server (Ass#1)
  try {
    const response = await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Log created:', result);
    statusMsg.innerHTML = '<p style="color: green;">Log created successfully!</p>';
    document.getElementById('celsius-input').value = ''; // ล้างช่อง

  } catch (error) {
    console.error('Failed to submit log:', error);
    statusMsg.innerHTML = '<p style="color: red;">Error: Failed to submit log.</p>';
  } finally {
    // เปิดปุ่มให้กดใหม่ (ไม่ว่าจะสำเร็จหรือล้มเหลว)
    submitButton.disabled = false; 
  }
}

// =============================================
//  LOGIC FOR PAGE #3 (logs.html)
// =============================================

// (⭐️ โค้ดใหม่) ตัวแปรสำหรับ "จำ" หน้าปัจจุบัน
let currentPage = 1;

// 1. ถ้าเราอยู่หน้า logs.html
if (path.endsWith('logs.html')) {
  // 1.1 หาปุ่ม
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');

  // 1.2 ดักฟังการคลิก
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--; // ลดค่าหน้า
      fetchAndDisplayLogs(currentPage);
    }
  });

  nextButton.addEventListener('click', () => {
    currentPage++; // เพิ่มค่าหน้า
    fetchAndDisplayLogs(currentPage);
  });

  // 1.3 โหลด Log หน้าแรก (Page 1) ทันที
  fetchAndDisplayLogs(currentPage);
}

// 2. (⭐️ โค้ดใหม่) ฟังก์ชันหลักสำหรับดึงและแสดง Log
async function fetchAndDisplayLogs(page) {
  const tbody = document.getElementById('logs-tbody');
  const pageInfo = document.getElementById('page-info');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');

  // 2.1 แสดงสถานะ "Loading..."
  tbody.innerHTML = `<tr><td colspan="5">Loading page ${page}...</td></tr>`;
  pageInfo.textContent = `Page ${page}`;

  // 2.2 เรียก Ass#1 (Endpoint ที่มี Pagination)
  const url = `${API_URL}/logs/${DRONE_ID}?page=${page}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const logs = await response.json();

    // 2.3 ล้างตาราง
    tbody.innerHTML = ''; 

    // 2.4 ตรวจสอบว่ามีข้อมูลไหม
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No logs found for page ${page}.</td></tr>`;
    } else {
      // 2.5 (สำคัญ) วนลูปสร้างแถว (<tr>)
      logs.forEach(log => {
        const row = document.createElement('tr');
        
        // จัดรูปแบบวันที่ให้อ่านง่าย
        const createdTime = new Date(log.created).toLocaleString('th-TH');

        row.innerHTML = `
          <td>${createdTime}</td>
          <td>${log.country}</td>
          <td>${log.drone_id}</td>
          <td>${log.drone_name}</td>
          <td>${log.celsius.toFixed(1)} °C</td>
        `;
        tbody.appendChild(row);
      });
    }

    // 2.6 (⭐️ ตรรกะ Pagination) อัปเดตปุ่ม
    prevButton.disabled = (page === 1); // ปิดปุ่ม "Previous" ถ้าอยู่หน้า 1
    nextButton.disabled = (logs.length < 12); // ปิดปุ่ม "Next" ถ้าข้อมูลที่ได้มาน้อยกว่า 12 (แปลว่านี่คือหน้าสุดท้าย)

  } catch (error) {
    console.error('Failed to fetch logs:', error);
    tbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error loading logs.</td></tr>`;
  }
}