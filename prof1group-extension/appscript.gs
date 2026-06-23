/**
 * PROF1Group Agent — Google Apps Script
 * 
 * ІНСТРУКЦІЯ:
 * 1. Відкрий script.google.com → Новий проєкт
 * 2. Замінити весь код на цей файл
 * 3. Зберегти проєкт
 * 4. Натиснути "Розгорнути" → "Новий деплой"
 *    - Тип: Веб-додаток
 *    - Виконувати як: Я (My Google account)
 *    - Хто має доступ: Усі (Anyone)
 * 5. Авторизувати та скопіювати URL деплою
 * 6. Вставити URL у налаштування розширення
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetUrl = writeContentPlan(data);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sheetUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// For CORS preflight and GET test
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'PROF1Group Agent Apps Script активний' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeContentPlan(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('PROF1Group Контент-план');
  const sheetName = `${data.monthName} ${data.year}`;
  
  // Delete existing sheet with same name if exists
  const existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);
  
  const sheet = ss.insertSheet(sheetName);
  
  // ── Header row ──────────────────────────────────────────────────────────
  const headers = ['День', 'Дата', 'День тижня', 'Тип поста', 'Тема', 'Текст поста', 'Хештеги'];
  sheet.appendRow(headers);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a56db');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  
  // ── Data rows ────────────────────────────────────────────────────────────
  const typeColors = {
    'Огляд товару':       '#dbeafe',
    'Тактична порада':    '#d1fae5',
    'Акція / Знижка':     '#fef3c7',
    'Сезонний контент':   '#ede9fe',
    'Бренд / Історія':    '#fce7f3',
    'Питання-відповідь':  '#f3f4f6'
  };
  
  data.posts.forEach((post, i) => {
    const rowNum = i + 2;
    const row = [
      post.day,
      post.date,
      post.dayOfWeek,
      post.type,
      post.topic,
      post.text,
      post.hashtags
    ];
    sheet.appendRow(row);
    
    // Color the row based on post type
    const color = typeColors[post.type] || '#ffffff';
    sheet.getRange(rowNum, 1, 1, headers.length).setBackground(color);
  });
  
  // ── Formatting ───────────────────────────────────────────────────────────
  sheet.setColumnWidth(1, 50);   // День
  sheet.setColumnWidth(2, 90);   // Дата
  sheet.setColumnWidth(3, 70);   // День тижня
  sheet.setColumnWidth(4, 130);  // Тип
  sheet.setColumnWidth(5, 250);  // Тема
  sheet.setColumnWidth(6, 400);  // Текст
  sheet.setColumnWidth(7, 200);  // Хештеги
  
  // Wrap text in topic and text columns
  sheet.getRange(2, 5, data.posts.length, 3).setWrap(true);
  
  // Freeze header
  sheet.setFrozenRows(1);
  
  // Add summary sheet
  writeSummarySheet(ss, data);
  
  // Make updated sheet active
  ss.setActiveSheet(sheet);
  
  return ss.getUrl();
}

function writeSummarySheet(ss, data) {
  const summaryName = '📊 Зведення';
  const existing = ss.getSheetByName(summaryName);
  if (existing) ss.deleteSheet(existing);
  
  const sheet = ss.insertSheet(summaryName, 0);
  
  // Title
  sheet.getRange('A1').setValue(`Контент-план: ${data.monthName} ${data.year}`);
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#1a56db');
  sheet.mergeRange('A1:D1');
  
  // Stats
  const typeCount = {};
  data.posts.forEach(p => {
    typeCount[p.type] = (typeCount[p.type] || 0) + 1;
  });
  
  sheet.getRange('A3').setValue('Тип поста');
  sheet.getRange('B3').setValue('Кількість');
  sheet.getRange('A3:B3').setFontWeight('bold').setBackground('#1a56db').setFontColor('#fff');
  
  let row = 4;
  Object.entries(typeCount).forEach(([type, count]) => {
    sheet.getRange(row, 1).setValue(type);
    sheet.getRange(row, 2).setValue(count);
    row++;
  });
  
  sheet.getRange(row, 1).setValue('РАЗОМ');
  sheet.getRange(row, 2).setValue(data.posts.length);
  sheet.getRange(row, 1, 1, 2).setFontWeight('bold');
  
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 80);
}
