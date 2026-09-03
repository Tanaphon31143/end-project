export const users = [
  { id:"USR001", name:"อรทัย พัฒนกิจ", email:"admin@school.ac.th", role:"Admin", status:"ใช้งาน" },
  { id:"USR002", name:"สมชาย ใจดี", email:"somchai@school.ac.th", role:"Teacher", status:"ใช้งาน" },
  { id:"USR003", name:"กิตติพงษ์ ปัญญา", email:"66010001@school.ac.th", role:"Student", status:"ใช้งาน" },
  { id:"USR004", name:"ชนกนันท์ เจริญสุข", email:"66010002@school.ac.th", role:"Student", status:"ระงับ" },
];
export const students = [
  { id:"66010001", name:"เด็กชายกิตติพงษ์ ปัญญา", room:"ม.5/1", number:"1", parent:"คุณศิริพร ปัญญา", phone:"081-234-5678" },
  { id:"66010002", name:"เด็กหญิงชนกนันท์ เจริญสุข", room:"ม.5/1", number:"2", parent:"คุณนภา เจริญสุข", phone:"089-345-6789" },
  { id:"66010003", name:"เด็กชายวรวิชญ์ แซ่ตั้ง", room:"ม.5/1", number:"3", parent:"คุณวิภา แซ่ตั้ง", phone:"086-456-7890" },
  { id:"66010004", name:"เด็กหญิงณัฐธิดา ศรีสมบัติ", room:"ม.5/2", number:"1", parent:"คุณสมพร ศรีสมบัติ", phone:"082-567-8901" },
];
export const teachers = [
  { id:"T001", name:"นายสมชาย ใจดี", department:"วิทยาศาสตร์", subjects:"ฟิสิกส์, วิทยาศาสตร์", phone:"081-111-2233" },
  { id:"T002", name:"นางสาววราภรณ์ แก้วใส", department:"คณิตศาสตร์", subjects:"คณิตศาสตร์พื้นฐาน", phone:"082-222-3344" },
  { id:"T003", name:"นางพิชญา สุขเกษม", department:"ภาษาต่างประเทศ", subjects:"ภาษาอังกฤษ", phone:"083-333-4455" },
];
export const subjects = [
  { id:"ค31101", name:"คณิตศาสตร์พื้นฐาน", teacher:"วราภรณ์ แก้วใส", room:"ม.5/1–ม.5/4", students:"158 คน" },
  { id:"ว31101", name:"ฟิสิกส์", teacher:"สมชาย ใจดี", room:"ม.5/1–ม.5/2", students:"80 คน" },
  { id:"อ31101", name:"ภาษาอังกฤษ", teacher:"พิชญา สุขเกษม", room:"ม.5/1–ม.5/4", students:"158 คน" },
];
export const faceRecords = [
  { id:"66010001", name:"กิตติพงษ์ ปัญญา", photos:"5 รูป", status:"พร้อมใช้งาน", date:"10 พ.ค. 2569" },
  { id:"66010002", name:"ชนกนันท์ เจริญสุข", photos:"5 รูป", status:"พร้อมใช้งาน", date:"10 พ.ค. 2569" },
  { id:"66010003", name:"วรวิชญ์ แซ่ตั้ง", photos:"3 รูป", status:"ควรเพิ่มรูป", date:"11 พ.ค. 2569" },
];
export const attendance = [
  { id:"AT001", date:"15 พ.ค. 2569", student:"กิตติพงษ์ ปัญญา", subject:"ฟิสิกส์", time:"08:15:23", status:"มาเรียน" },
  { id:"AT002", date:"15 พ.ค. 2569", student:"ชนกนันท์ เจริญสุข", subject:"ฟิสิกส์", time:"08:16:05", status:"มาเรียน" },
  { id:"AT003", date:"15 พ.ค. 2569", student:"วรวิชญ์ แซ่ตั้ง", subject:"ฟิสิกส์", time:"08:22:18", status:"สาย" },
  { id:"AT004", date:"15 พ.ค. 2569", student:"ณัฐธิดา ศรีสมบัติ", subject:"ภาษาอังกฤษ", time:"-", status:"ลา" },
  { id:"AT005", date:"15 พ.ค. 2569", student:"ภูวดล วงศ์ดี", subject:"ภาษาอังกฤษ", time:"-", status:"ขาด" },
];
