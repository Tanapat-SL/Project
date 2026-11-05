MATCHFOUND — Product & Development Handoff (AI Brief)
เอกสารส่งต่องานสำหรับ AI Developer / Coding Agent เพื่อพัฒนา MATCHFOUND ต่อจากโค้ดปัจจุบัน
เป้าหมาย: ทำให้แพลตฟอร์มหาเพื่อนเล่นเกม สร้างทีม และค้นหาห้องมีความเสถียร ปลอดภัย และใช้งานได้จริง โดยเพิ่ม AI ช่วยค้นหาห้องและดูแลชุมชน
ภาษาเอกสาร: ไทย | ชื่อระบบ/ตัวแปร/API คงภาษาอังกฤษตามโค้ด

0. คำสั่งสำคัญสำหรับ AI ที่รับช่วงต่อ
1. เริ่มจากตรวจ repository จริงก่อนแก้โค้ด อ่าน README_TH.md, CHANGELOG_TH.md, package.json, frontend/package.json, Prisma schema/migrations, routes, services, controllers, middleware และหน้าที่เกี่ยวข้อง อย่าสมมติว่าไฟล์หรือฟีเจอร์อยู่ตามเอกสารจนกว่าจะตรวจพบในโค้ด
2. ใช้โปรเจกต์ปัจจุบันเป็นฐาน ห้ามเขียนระบบใหม่หรือเปลี่ยนเทคโนโลยีโดยไม่มีเหตุผลและแผน migration ที่ชัดเจน
3. แยกสถานะงานทุกข้อเป็น มีอยู่และตรวจแล้ว, มีบางส่วน, ยังไม่มี, ต้องทดสอบ อย่าอ้างว่าฟีเจอร์เสร็จเพียงเพราะมีหน้า UI หรือมี API ชื่อคล้ายกัน
4. ก่อนแก้ฐานข้อมูล ให้สำรองข้อมูล/ตรวจ migration เดิม ห้ามใช้คำสั่ง destructive เช่น reset, drop database หรือ force reset กับข้อมูลผู้ใช้จริง
5. ห้าม hardcode API keys, OAuth secrets, JWT secrets, passwords หรือข้อมูลส่วนตัวลงใน source code, frontend, log, test fixture หรือเอกสาร
6. ห้ามนำ .env จริงหรือ node_modules ขึ้น ZIP/Git ชุดส่งมอบต้องมี .env.example เท่านั้น
7. หลังแก้ทุกส่วน ให้รันทดสอบที่ทำได้จริง และรายงานคำสั่งกับผลลัพธ์ตามจริง แยกการทดสอบแบบ mock ออกจากการทดสอบบริการจริง
8. ให้ความสำคัญกับ Security, Data integrity และ UX มากกว่าการเพิ่มจำนวนฟีเจอร์
9. ทุกฟีเจอร์ที่ผู้ใช้มองเห็นต้องมี loading, empty, success, error states และ validation ที่เหมาะสม
10. ห้ามใช้ AI ตัดสินแบนผู้ใช้อัตโนมัติจากข้อความเดียว และห้ามแสดงคะแนนหรือสถานะ Verified ที่ไม่มีข้อมูลยืนยันรองรับ
1. ภาพรวมผลิตภัณฑ์
1.1 แนวคิด
MATCHFOUND คือแพลตฟอร์มสำหรับเกมเมอร์ที่ต้องการ:
- หาเพื่อนเล่นเกมที่มีความสนใจและเวลาว่างตรงกัน
- ค้นหาห้อง/ปาร์ตี้ที่เหมาะกับระดับฝีมือและรูปแบบการเล่น
- สร้างปาร์ตี้สำหรับเล่นเป็นครั้ง ๆ และสร้างทีมระยะยาว
- สื่อสาร นัดหมาย และจัดการสมาชิก
- สร้างชุมชนที่เป็นมิตร ลดการคุกคามและพฤติกรรม Toxic
- เข้าร่วมกิจกรรมหรือการแข่งขันในอนาคต
1.2 จุดยืนที่แตกต่างจาก FACEIT
ศึกษาแนวคิดจาก FACEIT ได้ เช่น Party Finder, Matchmaking, Player Profile, Team/Club, Ranking และ Tournament แต่ ไม่ควรทำ MATCHFOUND ให้เป็น FACEIT clone
- FACEIT: เน้นการแข่งขัน ระบบแรงก์ และประสบการณ์ Competitive
- MATCHFOUND: เน้นการหาเพื่อนที่เข้ากันได้ สร้างปาร์ตี้/ทีม และประสบการณ์เล่นเกมร่วมกัน
จุดขายที่ควรเน้น:
1. Matchmaking ที่พิจารณาทั้งแรงก์ เวลา ภาษา บทบาท และสไตล์การเล่น
2. AI Room Finder ค้นหาห้องด้วยประโยคภาษาไทย/อังกฤษ
3. AI Toxic Guard ช่วยป้องกันข้อความคุกคามและดูแลชุมชน
4. ผู้เล่นไทยและ SEA: ภาษา ภูมิภาค และเวลาท้องถิ่น
5. โปรไฟล์และ Reputation ที่อิงประสบการณ์ร่วมกัน ไม่ใช่เพียงตัวเลขแรงก์
2. เทคโนโลยีและโครงสร้างปัจจุบัน
อ้างอิงจากชุดส่งมอบ MATCHFOUND_V2_AI_RELEASE และเอกสารในชุดนั้น ต้องตรวจสอบกับ repository จริงอีกครั้งก่อนเริ่มงาน
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Realtime: Socket.IO
- Authentication: Discord OAuth 2.0 และ session cookie แบบ HttpOnly ตามเอกสารชุดปัจจุบัน
- External integrations: FACEIT Data API (ข้อมูลโปรไฟล์สาธารณะ)
- AI provider: OpenAI API ผ่าน Backend เท่านั้น
API กลุ่มหลักที่ระบุใน README ปัจจุบัน:
Prefix	หน้าที่
/api/auth	Discord OAuth, session, logout, current user
/api/users	โปรไฟล์ เกมที่เล่น และข้อมูลผู้เล่น
/api/users/availability	ตารางเวลาว่าง
/api/parties	ค้นหา/สร้าง/จัดการปาร์ตี้และสมาชิก
/api/ai	AI Room Finder, Toxic Guard status และ Smart Matchmaking
/api/teams	ทีมและใบสมัครสมาชิก
/api/tournaments	รายการแข่งขันและลงทะเบียนทีม
/api/integrations	FACEIT Data API และบัญชีเกมที่เชื่อม
/api/feedback	Player Reputation
/api/admin	Admin dashboard และการจัดการรายงาน
/api/chat	แชทปาร์ตี้และแชทส่วนตัว


อย่าสร้าง endpoint ซ้ำก่อนตรวจ router ปัจจุบัน และให้ใช้ response/error format เดียวกันทั้งระบบ
3. ระบบเดิมและงานที่เริ่มมีในชุด V2 AI แล้ว
รายการด้านล่างคือสิ่งที่เอกสาร CHANGELOG/README ของชุด V2 AI ระบุไว้ ไม่ใช่การรับรองว่าทุกเส้นทางผ่าน End-to-End แล้ว ให้ Coding Agent ตรวจ implementation และทดสอบใหม่
3.1 ฟังก์ชันหลักเดิม
- Discord OAuth login
- Player profile: Bio, ภาษา, เกม, แรงก์ และแพลตฟอร์ม
- LFG / Party Finder พร้อมค้นหาและตัวกรอง
- สร้างปาร์ตี้ กำหนดจำนวนสมาชิก และส่ง/อนุมัติคำขอเข้าร่วม
- Party chat และ Direct Message ผ่าน Socket.IO
- ระบบเพื่อนและคำขอเป็นเพื่อน
- Notifications
- Block และ Report
- Availability model สำหรับช่วงเวลาว่าง
- Team และ TeamMember / ใบสมัครเข้าทีม
- Tournament MVP
- FACEIT Data API สำหรับค้นหาโปรไฟล์สาธารณะ
- Player Reputation / feedback
- Admin dashboard และจัดการรายงาน
3.2 งานที่ CHANGELOG ของ V2 AI ระบุว่าแก้/เพิ่มแล้ว
- Party Finder เทียบแรงก์กับช่วง min/max และซ่อนห้องเต็ม/หมดอายุจากรายการ OPEN
- Smart Matchmaking ใช้เกม แรงก์ สไตล์ ตำแหน่ง ไมค์ ภาษา ภูมิภาค และเวลาว่าง พร้อมเหตุผลคะแนน
- คัดผู้ใช้ที่บล็อกกันออกจากผลการแนะนำ
- เพิ่ม partyId ใน Socket event ของข้อความแชทปาร์ตี้
- จัดการ socket join/leave/reconnect และตรวจสิทธิ์สมาชิกห้อง
- ป้องกันการโหลดประวัติข้อความเก่าทับห้องที่เพิ่งเลือก
- แก้ Report/Block dialog ให้ใช้งานได้แม้ห้องไม่มีข้อความ
- เพิ่ม API ดูใบสมัครทีมของผู้ใช้และสถานะรออนุมัติ
- เพิ่มตัวเลือกรูปแบบ Tournament: Single Elimination, Double Elimination, Round Robin
- เพิ่ม .env.example, compose.yaml, scripts/setup.ps1, scripts/start-dev.ps1
- เพิ่ม AI Toxic Guard และ AI Room Finder ตามรายละเอียดในหัวข้อ 4
4. ฟีเจอร์ AI ที่ต้องมี
4.1 AI Toxic Guard — ระบบช่วยตรวจจับข้อความ Toxic
เป้าหมาย
ช่วยลดข้อความคุกคาม/เกลียดชัง/ข่มขู่ในพื้นที่ชุมชน โดยตรวจข้อความฝั่ง Backend ก่อนบันทึกหรือกระจายผ่าน Socket.IO
ขอบเขตการตรวจ
- Party chat
- Direct messages
- ชื่อและรายละเอียด Party
- ชื่อและรายละเอียด Team
- ข้อความสมัครเข้าทีม/ข้อความที่ผู้ใช้สร้างในพื้นที่สาธารณะ
- จุดอื่นที่มี User Generated Content ให้ประเมินเพิ่มโดยไม่ทำให้ latency สูงเกินจำเป็น
พฤติกรรมที่ต้องการ
1. ตรวจเนื้อหาฝั่ง Backend เท่านั้น Frontend validation เป็นเพียง UX ไม่ใช่ security boundary
2. ใช้ OpenAI Moderation API เมื่อมี API Key และส่งข้อความผ่าน Backend เท่านั้น
3. หากข้อความถูกจัดว่าเข้าข่ายระดับที่กำหนด ให้ปฏิเสธด้วย error code ที่ Frontend เข้าใจได้ เช่น TOXIC_CONTENT_BLOCKED
4. ข้อความที่ถูกบล็อกต้องไม่ถูกบันทึกลงฐานข้อมูลและไม่ถูก emit ผ่าน Socket.IO
5. Frontend ต้องแสดงคำอธิบายสุภาพว่าข้อความไม่ผ่านกฎชุมชน ไม่เปิดเผยรายละเอียดระบบภายใน
6. Local keyword fallback ใช้ได้เมื่อไม่มี API Key/บริการขัดข้อง แต่ต้องแจ้งอย่างชัดเจนว่าเป็น ตัวกรองพื้นฐาน ไม่ใช่ AI และมีโอกาสพลาดสูง
7. ห้าม auto-ban จากการถูกบล็อกเพียงครั้งเดียว
8. ต้องมี Admin review สำหรับรายงาน/กรณีรุนแรง และต้องมีช่องทางอุทธรณ์เมื่อมีการลงโทษ
แนวทางการจัดระดับ
- ALLOW: ข้อความทั่วไป ไม่เข้าข่ายละเมิด
- WARN: ภาษาหยาบ/ก้าวร้าวระดับต่ำหรือไม่ชัดเจน ให้เตือนหรือขอแก้ไขตาม policy
- BLOCK: การคุกคามชัดเจน การเหยียด/เกลียดชัง การข่มขู่ หรือเนื้อหาที่นโยบายชุมชนห้าม
- REVIEW: กรณีคลุมเครือหรือมีความเสี่ยงสูง ให้ส่งเข้าคิว Admin แทนการแบนอัตโนมัติ
การตั้ง threshold ต้องอิงผล moderation และทดสอบภาษาไทยจริง ห้ามเดา category/score threshold โดยไม่มี test cases
UX ที่ต้องมี
- สถานะ Toxic Guard เปิด/ปิดหรือสถานะผู้ให้บริการ
- แจ้งเตือนเมื่อข้อความถูกปฏิเสธ
- อย่าลบข้อความเดิมของผู้ใช้โดยไม่แจ้ง
- อย่าทำให้คำหยาบทั่วไปทุกคำถูกบล็อกโดยอัตโนมัติ ต้องพิจารณาบริบท
- รองรับข้อความภาษาไทย อังกฤษ และ code-switching
Privacy และ Logging
- แจ้งผู้ใช้ใน Privacy Policy ว่าข้อความบางประเภทถูกส่งไปยังผู้ให้บริการ AI เพื่อตรวจสอบ หากเปิดใช้ OpenAI
- ส่งเฉพาะข้อความ/บริบทเท่าที่จำเป็น ไม่ส่งประวัติแชททั้งหมด
- หลีกเลี่ยงการเก็บ raw text ที่ถูกบล็อกใน application logs
- บันทึกเฉพาะ metadata ที่จำเป็น เช่น userId, content type, decision, category, timestamp และ reference ID ตามนโยบาย retention
- จำกัดสิทธิ์ผู้ดูแลที่เข้าถึง moderation records
Acceptance Criteria
- ข้อความที่ถูก block ไม่ถูก persist และไม่ถูก broadcast
- ผู้ใช้ทั่วไปไม่สามารถปลอม moderation result จาก Frontend ได้
- หาก provider timeout/error ต้องเข้าสู่ fallback ที่ระบุสถานะได้ ไม่เปิดช่องให้ข้อความเสี่ยงผ่านโดยไม่ตั้งใจ
- มี tests สำหรับภาษาไทย/อังกฤษ, คำด่าแบบไม่เจาะจง, การคุกคาม, การเหยียด, การข่มขู่, ข้อความปกติ และ false positives
- ทดสอบว่า Admin review ไม่ทำให้ข้อความ private ถูกเปิดเผยกับผู้ไม่มีสิทธิ์
4.2 AI Room Finder — ค้นหาห้องจากภาษาธรรมชาติ
เป้าหมาย
ให้ผู้ใช้พิมพ์สิ่งที่ต้องการ เช่น:
หา Valorant แรงก์ Gold เล่นชิล ๆ คืนนี้ คนไทย มีไมค์ ขอเพื่อน Toxic น้อย

ระบบแปลงเป็น structured filters แล้วค้นหาห้องจากข้อมูลจริงใน PostgreSQL
ฟิลด์ที่ AI ควรแยกได้
- game: เกมที่ต้องการ
- rankMin, rankMax หรือ rank tier ที่สอดคล้องกับระบบเกม
- mode: Ranked / Casual / Co-op / Custom ตาม enum จริง
- playStyle: Competitive / Casual / Chill / Practice ฯลฯ
- language
- region
- micRequired หรือ micPreference โดยแยก “ไม่ใช้ไมค์” ออกจาก “ต้องมีไมค์” ให้ถูกต้อง
- role: ตำแหน่งที่ต้องการ เช่น Support, Tank, Controller, Duelist ตามเกม
- availability: วันและเวลาที่ต้องการเล่น โดยตีความ timezone ให้ชัดเจน
- partySize หรือจำนวนช่องว่าง หากผู้ใช้ระบุ
พฤติกรรมที่ต้องการ
1. ใช้ OpenAI Responses API / structured JSON output เมื่อมี OPENAI_API_KEY
2. ตรวจ JSON ด้วย Zod หรือ validator ที่ใช้ในโปรเจกต์ ก่อนส่งเข้า query layer
3. อนุญาตเฉพาะ field ที่ระบบรู้จัก ห้ามให้โมเดลสร้าง Prisma query หรือ SQL เอง
4. หากไม่มี API Key ใช้ local parser เป็น fallback และแจ้งว่าเป็น Basic Search ไม่ใช่ AI
5. หาก AI provider ล่ม ให้ fallback อย่างปลอดภัย และแสดงสถานะว่าใช้ Basic Search
6. แสดง “ฉันเข้าใจว่าคุณกำลังหา...” พร้อม tags/filters ที่ตีความ เพื่อให้ผู้ใช้แก้ไขได้
7. ใช้ข้อมูลห้องจริงเท่านั้น ห้ามสร้างชื่อห้อง/เวลา/จำนวนสมาชิก/availability ขึ้นเอง
8. แสดงเหตุผลที่ห้องถูกแนะนำ เช่น แรงก์อยู่ในช่วงเดียวกัน ภาษา/เวลา/ตำแหน่งตรงกัน
9. ผู้ใช้ต้องแก้ตัวกรองเองได้หลัง AI แปลคำค้น
10. กรณีคำค้นไม่ชัดเจน ให้ใช้ค่า null/ไม่ใส่ filter หรือถามข้อมูลเพิ่มตามความจำเป็น ห้ามเดาค่าแบบมีผลต่อผลลัพธ์มาก
Sorting / Ranking
- ค้นหาเฉพาะ Party ที่ยังเปิดรับสมาชิก ไม่เต็ม และไม่หมดอายุ
- ใช้ rank range ของห้อง ไม่ใช่ exact equality เท่านั้น
- เคารพ block relationships และ privacy settings
- จัดอันดับจาก game, rank compatibility, mode/style, role, mic, language, region และ availability
- แยก “compatibility score” ออกจาก Elo/skill rating
- แสดงคะแนนเป็นค่าประมาณเชิงความเข้ากันได้ ไม่ใช่การรับรองฝีมือหรือความสำเร็จ
Acceptance Criteria
ทดสอบคำค้นภาษาไทย/อังกฤษและคำปฏิเสธ เช่น:
- “หา Valorant Gold เล่นคืนนี้ มีไมค์”
- “หา CS2 เล่นชิล ไม่ใช้ไมค์”
- “Apex เล่น Ranked ภาษาไทย แรงก์ใกล้ Platinum”
- “หาเพื่อนเล่นพรุ่งนี้ช่วง 20:00–22:00”
- “ไม่เอาห้องที่เต็มแล้ว”
ตรวจว่าฟิลด์ micRequired ไม่กลับด้าน, timezone ไม่คลาดเคลื่อน, ไม่มี SQL injection และผลลัพธ์ทุกห้องมาจาก DB จริง
4.3 AI Matchmaking — การแนะนำทีม/ปาร์ตี้
AI Room Finder ใช้ตีความคำค้น ส่วนการคำนวณคะแนนจับคู่ควรเริ่มด้วย rule-based scoring ที่อธิบายได้

ปัจจัยแนะนำ:
ปัจจัย	แนวทาง
Game compatibility	เกมตรงกัน ต้องเป็นเงื่อนไขหลัก
Rank compatibility	rank อยู่ในช่วงที่ปาร์ตี้รับ
Availability	ช่วงเวลาเล่นทับซ้อนกัน
Play style	Casual/Competitive/Practice ใกล้เคียงกัน
Role	ตำแหน่งที่ทีมขาดหรือร้องขอ
Language	ภาษาที่สื่อสารร่วมกันได้
Region	ping/ภูมิภาคเหมาะสม หากมีข้อมูลจริง
Mic	ตรงกับความต้องการของห้อง
Block/privacy	ห้ามแนะนำผู้ใช้ที่บล็อกกัน หรือผู้ใช้ที่ไม่อนุญาต


ถ้าจะใช้คะแนนเต็ม 100 ให้ตั้ง weight ใน config และอธิบายบนหน้าเว็บ ตัวอย่างน้ำหนักเป็นเพียงจุดเริ่มต้น ต้องปรับจาก feedback และข้อมูลจริง ห้ามนำค่า reputation หรือ demographic traits มาใช้กีดกันผู้เล่น
Acceptance Criteria
- คะแนนและเหตุผลต้องคำนวณซ้ำได้และมี unit tests
- ห้องที่ไม่ตรง game หรือเต็มแล้วต้องไม่ถูกแนะนำ แม้คะแนนด้านอื่นสูง
- ไม่แนะนำบัญชีที่ block กัน
- UI แสดงเหตุผลคะแนนอย่างเข้าใจได้
5. ฟีเจอร์ผลิตภัณฑ์อื่นที่ต้องพัฒนา
แบ่งตามลำดับความสำคัญ ไม่จำเป็นต้องทำทั้งหมดใน release เดียว
P0 — ความเสถียรและความปลอดภัยก่อนเปิดใช้งาน
1. Authentication / Authorization
   - ตรวจ Discord OAuth state, session fixation, expiry, logout และ cookie flags
   - ใช้ HttpOnly, Secure ใน Production, SameSite เหมาะสม และ HTTPS
   - ตรวจ role/ownership ในทุก endpoint ฝั่ง Server
   - ห้ามยกระดับ Admin จาก public endpoint
2. Socket.IO Security
   - Authenticate socket handshake
   - ตรวจสิทธิ์ผู้ใช้ก่อน join party/private chat rooms
   - ตรวจ membership ทุกครั้งที่ส่งข้อความ
   - join/leave/reconnect ต้อง sync กับสิทธิ์จริง
   - นำ socket ออกจากห้องเมื่อถูก kick, leave หรือ membership revoked
   - จำกัด payload size และ event rate
3. Database / Prisma
   - ตรวจ Prisma schema, migration history และ indexes
   - Migration ต้องรองรับฐานข้อมูลใหม่และฐานข้อมูลเดิมอย่างปลอดภัย
   - เพิ่ม unique constraints/foreign keys ตาม business rules
   - ทำ transaction กับงาน multi-step เช่น join party / approve team application
   - เพิ่ม backup/restore instructions
4. Input validation / API security
   - Validate request body, params, query ด้วย schema validator
   - Rate limit auth, chat, AI, report และ search
   - ป้องกัน XSS, injection, CSRF และ mass assignment
   - จำกัดขนาดข้อความ/ชื่อ/description
   - Error response ไม่เปิดเผย stack trace หรือ secret
5. Production configuration
   - CORS allowlist, trusted origins, HTTPS, secure cookies
   - secrets ผ่าน environment/secret manager
   - Redis-backed rate limiter เมื่อมีหลาย Backend instances
   - logging, health checks และ database backup
P1 — Core user experience
5.1 Party Finder 2.0
ข้อมูล Party ที่ควรรองรับ:
- game และ platform
- mode (แยกจาก role)
- rankMin / rankMax ตาม rank model ของเกม
- required role / open slots
- play style: Competitive, Casual, Chill, Practice ฯลฯ
- language และ region
- mic preference
- schedule / start time / timezone
- expiry time
- party status: OPEN, FULL, IN_PROGRESS, CLOSED, EXPIRED ตาม state model ที่กำหนด
- owner และ membership permissions
ความสามารถ:
- Create / Edit / Close Party
- Join request / Approve / Reject / Cancel request
- Leave / Kick member (ตรวจสิทธิ์ owner/leader)
- ปิดการรับสมัครเมื่อเต็ม
- auto-expire หรือ archive ตามเวลา
- Party preview แสดงสมาชิก ช่องว่าง เงื่อนไข และเวลานัด
- ป้องกัน join race condition เมื่อมีผู้สมัครพร้อมกัน
5.2 Availability / Play Schedule
- ผู้ใช้กำหนดเวลาว่างประจำสัปดาห์
- รองรับ timezone และวัน/เวลาที่ระบุเป็น UTC ในฐานข้อมูล
- ผู้ใช้แก้ไข/ลบช่วงเวลาได้
- ตรวจเวลาซ้อนทับเพื่อแนะนำห้อง
- มี one-time availability สำหรับวันพิเศษ
- ไม่เปิดเผยตารางเวลาส่วนตัวละเอียดให้ผู้ใช้ทั่วไปโดยไม่จำเป็น
5.3 Player Profile
- avatar, display name, bio, language, region, platform
- เกมที่เล่นและ rank แยกตามเกม
- preferred roles, play style, mic preference
- availability summary แบบไม่เปิดเผยข้อมูลส่วนตัวเกินจำเป็น
- linked accounts และสถานะ verification แยกชัดเจน
- party/team history ตาม privacy settings
- block/report controls
5.4 Player Reputation
คำชมที่แนะนำ:
- Teamwork
- Good Communication
- Friendly Player
- Reliable Teammate
กติกา:
- ให้ feedback ได้เฉพาะผู้ที่เล่น/อยู่ party เดียวกันจริง และหลัง session ที่เกิดขึ้นจริง
- จำกัดจำนวน/ช่วงเวลาเพื่อป้องกัน spam หรือ brigading
- ป้องกันผู้ใช้ให้ feedback กับตัวเองหรือให้ซ้ำใน session เดียว
- ไม่ใช้ reputation เป็นคะแนน skill และไม่ควรเปิดเผย free-text ที่มีข้อมูลส่วนตัว
- มี report/appeal และการจัดการ abuse
5.5 Teams / Clubs
- Team แยกจาก Party: Party ใช้เล่นเป็นครั้ง ๆ; Team ใช้รวมกลุ่มระยะยาว
- สร้างทีม ตั้งชื่อ/คำอธิบาย/เกม/รูปแบบ/แรงก์ที่รับ
- Team roles: Owner, Captain, Member (หรือ role ตามที่เหมาะสม)
- invite / application / approve / reject / leave / kick
- ตั้งซ้อมและนัดเวลา
- Team profile, roster, open positions
- เปิดรับสมัครสมาชิกพร้อม moderation ของข้อมูลที่ผู้ใช้สร้าง
- Club/community เป็นระยะถัดไป ไม่จำเป็นต้องทำพร้อม Team MVP
P2 — Competitive / Growth Features
5.6 FACEIT / Game Account Integration
- FACEIT Data API ใช้ข้อมูลสาธารณะและ API key ฝั่ง Backend เท่านั้น
- แสดงว่า “เชื่อมข้อมูลโปรไฟล์” ไม่ใช่ “Verified Owner” จนกว่าจะยืนยัน ownership ด้วย OAuth/วิธีทางการที่ผู้ให้บริการอนุญาต
- ห้าม scraping หรือเก็บข้อมูลนอกขอบเขตเงื่อนไขบริการ
- แสดง source และ updatedAt ของข้อมูลภายนอก
- cache ข้อมูลตามข้อกำหนด API และมี retry/backoff
- ออกแบบ adapter เผื่อเพิ่มเกม/API อื่นภายหลัง
5.7 Statistics & Leaderboard
- จำนวน session / party ที่เล่นร่วมกัน
- สถิติเกมจาก API ที่ได้รับอนุญาต
- rank history เมื่อมีแหล่งข้อมูลที่เชื่อถือได้
- leaderboard รายเกม/ราย season ตามข้อมูลที่ตรวจสอบได้
- แยก community activity กับ competitive skill
- ระบุว่า data มาจาก API, ผู้ใช้กรอกเอง หรือระบบบันทึกเอง
5.8 Tournaments
MVP:
- สร้าง tournament, description, game, format, team size, registration window, schedule, rules
- ทีมสมัครและถอนตัวได้ตามกติกา
- Admin/Organizer จัดการการสมัคร
ระยะต่อไป:
- Bracket generation: Single Elimination, Double Elimination, Round Robin
- รายงานผลและยืนยันผลโดยทั้งสองทีม/Organizer
- dispute flow
- standings, match schedule, notifications
- Season / League
อย่าแสดง Tournament ว่าแข่งขันได้เต็มรูปแบบจนกว่า bracket, match result, dispute และ permission flow จะทำงานครบ
6. Admin & Community Safety
Admin panel ควรมี:
- รายการ Reports พร้อมประเภท/เวลา/สถานะ/priority
- ดูบริบทเท่าที่จำเป็นและตาม permission
- Assign moderator
- Resolve / Dismiss / Escalate
- Warn / Mute / Suspend / Ban ตาม policy และระยะเวลา
- audit log สำหรับทุก action
- appeal/review status
- จัดการเกม/ตัวเลือก rank/mode ที่ระบบรองรับ
- สถิติ safety แบบ aggregate โดยไม่เปิดเผยข้อมูลส่วนบุคคลเกินจำเป็น
ข้อกำหนด:
- ทุก action ต้องตรวจ ADMIN/MODERATOR ที่ Backend
- บันทึกผู้กระทำ เหตุผล เวลา และ target
- ห้ามใช้ AI moderation เป็นหลักฐานเพียงอย่างเดียวสำหรับ permanent ban
- Moderators ห้ามเปิดอ่านข้อความส่วนตัวโดยไม่มีเหตุผล/สิทธิ์/นโยบายที่ชัดเจน
7. UX / หน้าเว็บที่ควรมี
เมนูหลักที่แนะนำ:
1. Explore — ค้นหาปาร์ตี้/ผู้เล่น
2. AI Matchmaking — ค้นหาด้วยข้อความและแนะนำปาร์ตี้
3. Create Party — สร้างและจัดการปาร์ตี้
4. My Teams — ทีมและใบสมัคร
5. Tournaments — รายการแข่งขัน
6. Chat — Party chat / Direct messages
7. Notifications — คำขอและกิจกรรม
8. Profile — ข้อมูลผู้เล่น เกม และบัญชีที่เชื่อม
9. Settings & Privacy — การตั้งค่า/สิทธิ์/Block list
10. Admin — แสดงเฉพาะผู้มีสิทธิ์
ทุกหน้าต้องรองรับ:
- responsive mobile/desktop
- loading skeleton
- empty state พร้อม CTA
- error/retry state
- form validation และข้อความ error ภาษาไทย
- pagination หรือ infinite scroll ที่เหมาะสม
- accessibility: keyboard navigation, focus state, labels, contrast
- แจ้งผล action สำเร็จ/ล้มเหลว
8. ข้อเสนอด้านฐานข้อมูล
ตรวจ schema จริงก่อนเพิ่ม model และหลีกเลี่ยงการสร้างตารางซ้ำกับที่มีอยู่แล้ว

Models/ตารางที่ควรมีหรือพิจารณา:
- User
- Game
- UserGameProfile หรือ model เดิมที่เก็บ rank ต่อเกม
- Party
- PartyMember
- PartyJoinRequest
- Availability
- Team
- TeamMember
- TeamApplication
- Tournament
- TournamentTeam / TournamentRegistration
- TournamentMatch / TournamentBracket ในระยะ P2
- ChatRoom / Message
- FriendRequest / Friendship
- Notification
- Block
- Report
- ModerationEvent (เก็บ metadata ที่จำเป็น ไม่เก็บ raw content โดย default)
- PlayerFeedback
- LinkedGameAccount
- AuditLog
ต้องกำหนด:
- Primary key และ unique constraints
- Foreign keys และ onDelete behavior
- indexes สำหรับ query ที่ใช้บ่อย (game/status/expiry/rank/createdAt/ownerId)
- timestamps (createdAt, updatedAt)
- transaction boundaries
- retention policy ของ chat/report/moderation data
- migration ที่ย้อนกลับ/แก้ปัญหาได้ตามความเหมาะสม
9. API / Backend design requirements
แนวทาง:
- ใช้ controller/service/repository separation ตามโครงสร้างเดิม
- AI provider เรียกจาก Backend เท่านั้น
- ทำ timeout, retry เฉพาะกรณีเหมาะสม และ provider error mapping
- validate input/output ทุก boundary
- ใช้ pagination สำหรับรายการขนาดใหญ่
- ใช้ transaction กับ concurrent writes
- ใช้ idempotency หรือ unique constraints กับ action ที่อาจถูกส่งซ้ำ
- ห้ามรับ userId, senderId, role, isAdmin จาก Client เป็นค่าที่เชื่อถือได้ ต้อง derive จาก session
Error codes ที่ UI ควรรองรับอย่างสม่ำเสมอ เช่น:
- UNAUTHORIZED
- FORBIDDEN
- VALIDATION_ERROR
- NOT_FOUND
- CONFLICT
- RATE_LIMITED
- TOXIC_CONTENT_BLOCKED
- AI_PROVIDER_UNAVAILABLE
- INTERNAL_ERROR
ปรับชื่อให้ตรงกับ error convention ที่มีอยู่แล้ว ไม่ต้องเพิ่ม duplicate codes
10. Security & Privacy Checklist
- [ ] .env ไม่อยู่ใน Git/ZIP
- [ ] เปลี่ยน Discord Client Secret ที่เคยถูกแชร์/สงสัยว่ารั่ว
- [ ] ใช้ JWT/session secret แบบสุ่มยาว และไม่ใช้ค่า default ใน Production
- [ ] HTTPS และ Secure/HttpOnly/SameSite cookies
- [ ] ตรวจ OAuth state และ callback URL allowlist
- [ ] CORS allowlist ไม่ใช้ wildcard กับ credentialed requests
- [ ] CSRF/origin protection สำหรับ cookie-authenticated mutations
- [ ] Socket handshake authentication และ per-room authorization
- [ ] authorization ตรวจที่ Backend ทุก API
- [ ] input validation / output encoding / payload limits
- [ ] rate limit: login, chat, AI, search, join requests, reports
- [ ] secrets ไม่อยู่ใน frontend build/logs
- [ ] AI provider timeout และ fallback behavior ปลอดภัย
- [ ] Privacy Policy แจ้งการส่งข้อความ/คำค้นให้ AI provider
- [ ] data minimization และ retention policy
- [ ] Admin actions มี audit trail
- [ ] database backup และ restore ทดสอบแล้ว
11. Testing Plan / Definition of Done
11.1 Automated Tests
- Unit tests: matchmaking scoring, rank range, availability overlap, input parser, moderation mapping
- Integration tests: auth guards, party join/leave, team applications, chat authorization, report flow, AI routes
- Database tests: migrations, unique constraints, transaction/concurrency
- Frontend tests: forms, filters, AI parsed filter chips, error/loading/empty states
- Security tests: unauthorized room join, spoofed sender ID, blocked users, oversized payload, rate limits
11.2 End-to-End User Journeys
1. สมัคร/เข้าสู่ระบบด้วย Discord
2. ตั้งโปรไฟล์และเพิ่มเกม/แรงก์
3. ตั้งเวลาว่าง
4. สร้างปาร์ตี้พร้อม rank range, role, mode, mic และ schedule
5. ค้นหาด้วย filter ปกติ
6. ค้นหาด้วย AI Room Finder
7. ส่งคำขอเข้าปาร์ตี้และให้ owner อนุมัติ
8. แชทในปาร์ตี้แบบ real-time
9. ส่งข้อความที่ผิดกฎและตรวจว่าไม่ถูก persist/broadcast
10. ออกจากปาร์ตี้/ถูก kick แล้วต้องไม่มีสิทธิ์อ่านข้อความต่อ
11. เพิ่มเพื่อน ส่ง/รับ/ปฏิเสธคำขอ และแชทส่วนตัว
12. Block/Report ผู้ใช้
13. สร้างทีมและสมัครสมาชิก
14. ให้ Admin ตรวจ Report และบันทึก action
15. สมัคร Tournament และทดสอบ flow ตามขอบเขต MVP
11.3 Commands to run
ตรวจคำสั่งจริงใน package.json ก่อน แล้วรันอย่างน้อย:
npm ci
npm run prisma:generate
npm run db:deploy
npm run build
Frontend (จากโฟลเดอร์ frontend):
npm ci
npm run build
เพิ่ม test/lint/typecheck ตาม scripts ที่มีใน repository
11.4 Definition of Done
ฟีเจอร์ถือว่าเสร็จเมื่อ:
- UI เชื่อม Backend จริง ไม่ใช่ mock-only
- permission/validation อยู่ฝั่ง Backend
- database schema และ migration รองรับ
- loading/empty/error/success state ครบ
- มี unit/integration tests สำหรับ business rules สำคัญ
- E2E path ที่เกี่ยวข้องผ่าน
- build ผ่านทั้ง Backend และ Frontend
- คู่มือและ .env.example อัปเดต
- ไม่มี secrets หรือข้อมูลจริงใน artifact
- เอกสารระบุข้อจำกัดที่ยังเหลืออย่างตรงไปตรงมา
12. สถานะการทดสอบที่ทราบจากชุด V2 AI ก่อนส่งต่องาน
จาก CHANGELOG/README ในชุด MATCHFOUND_V2_AI_RELEASE ระบุว่า:
รายการ	สถานะที่รายงานไว้
Backend TypeScript build	ผ่าน
Frontend TypeScript check	ผ่าน
Local AI fallback tests	ผ่านตัวอย่างที่ทดสอบ
OpenAI provider integration	ผ่าน mock HTTP response เท่านั้น ไม่ได้ยิง API จริง
Frontend Vite production build	ยังยืนยันไม่ได้ใน environment ที่สร้างชุดส่งมอบ เนื่องจาก optional native Rollup package ขาด/ติดตั้งไม่ได้
Prisma migration กับ PostgreSQL จริง	ยังไม่ได้ทดสอบกับ PostgreSQL server จริง
Runtime API + Socket.IO end-to-end	ยังไม่ได้ทดสอบครบกับ environment เป้าหมาย
Discord OAuth / FACEIT / OpenAI ด้วย credentials จริง	ยังไม่ได้ยืนยัน


ข้อควรตรวจเป็นพิเศษ: README ของชุด V2 AI ที่ส่งก่อนหน้าระบุค่า OPENAI_MATCH_MODEL เป็น gpt-6-luna ซึ่งยังไม่ได้ยืนยันว่าเป็น model ID ที่ API account ใช้งานได้ ห้ามถือค่านี้เป็นค่าที่ถูกต้องโดยอัตโนมัติ ให้ตรวจ model IDs ที่รองรับในบัญชี/API documentation ปัจจุบัน แล้วใช้ค่าที่ผู้พัฒนามีสิทธิ์เรียกจริง หรือกำหนดเป็น placeholder ใน .env.example
13. Roadmap แนะนำ
Release 1 — Stability & Trust (ทำก่อน)
- ตรวจ Authentication, Authorization, Socket.IO, CSRF, CORS และ rate limits
- ตรวจ Prisma schema/migrations และทำ backup/restore test
- ทดสอบ Party Finder, join request, chat, friends, teams แบบ end-to-end
- แก้ปัญหาที่พบก่อนเพิ่มฟีเจอร์ใหม่
- เพิ่ม Admin moderation queue และ audit logs ให้ใช้งานจริง
Release 2 — AI Core
- ทำ AI Toxic Guard ให้มี threshold, policy, fallback, privacy notice และ appeal/review flow
- ทำ AI Room Finder ให้ parse ภาษาไทย/อังกฤษได้ถูกต้องและมี filter preview/edit
- เพิ่ม tests สำหรับ negative phrasing เช่น “ไม่ใช้ไมค์”
- ทำ Smart Matchmaking ให้ explainable และกันข้อมูลปลอม/ไม่ครบ
Release 3 — Better Party & Player Experience
- Party lifecycle ครบ (edit/close/expire/leave/kick/slot management)
- Availability UI และ timezone handling
- Profile completeness / linked game accounts
- Player Reputation ที่กัน abuse ได้
- Teams และ Team schedule
Release 4 — Community & Competitive
- Clubs/community
- Tournament brackets, match results, disputes
- Stats และ leaderboards จาก data source ที่เชื่อถือได้
- เพิ่มเกมและ integration อื่นเมื่อได้รับอนุญาต
14. รูปแบบรายงานเมื่อ AI ทำงานเสร็จแต่ละรอบ
ให้ AI ส่งสรุปตาม template นี้ทุกครั้ง:
เปลี่ยนอะไร
- รายชื่อ feature / bug ที่แก้
- ไฟล์สำคัญที่แก้และเหตุผล
ผลทดสอบ
- คำสั่งที่รัน
- ผ่าน/ไม่ผ่าน พร้อม error จริง
- แยก mock test กับ real provider test
ยังไม่เสร็จ / ความเสี่ยง
- รายการที่ยังไม่ implement
- รายการที่ต้อง credentials หรือ service จริง
- migration หรือ breaking change ที่ต้องระวัง
วิธีทดลอง
- คำสั่งติดตั้ง/รัน
- URL และบัญชี/role ที่ต้องใช้ (ห้ามใส่รหัสผ่าน/secret)
- ขั้นตอนทดสอบทีละข้อ
ไฟล์ส่งมอบ
- ZIP/release artifact
- README / CHANGELOG
- .env.example เท่านั้น ห้ามแนบ .env
15. เป้าหมายสุดท้าย
ทำให้ MATCHFOUND เป็นแพลตฟอร์มที่ผู้ใช้สามารถเข้ามาแล้วทำได้จริงตั้งแต่:
1. สมัครและตั้งโปรไฟล์
2. บอกเกม แรงก์ ตำแหน่ง ภาษา และเวลาที่สะดวก
3. ค้นหาห้องด้วย filter หรือพิมพ์ภาษาธรรมชาติให้ AI ช่วยหา
4. เห็นเหตุผลว่าทำไมห้องนั้นเหมาะกับตัวเอง
5. เข้าร่วมปาร์ตี้ แชท และนัดหมายได้อย่างปลอดภัย
6. สร้างทีมและมี Reputation จากประสบการณ์ร่วมกัน
7. ใช้ชุมชนที่มีระบบป้องกัน Toxic และ Admin ดูแลได้
8. ต่อไปสู่การแข่งขันและสถิติเมื่อมีข้อมูลและผู้ใช้เพียงพอ
Product statement:
MATCHFOUND — Find teammates who fit your game, your schedule, and your vibe.