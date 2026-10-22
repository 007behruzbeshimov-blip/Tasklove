# TaskBall 🎯

Vazifalar boshqarish va ball yig'ish tizimi.

## Fayllar

| Fayl | Tavsif |
|------|--------|
| `index.html` | Frontend (HTML + CSS + JS) — **hoziroq ishlatish uchun** |
| `server.js` | Backend (Node.js + Express) — ixtiyoriy |
| `package.json` | Node.js bog'liqliklar |

---

## 🚀 Tezkor ishlatish (Node.js kerak emas)

`index.html` faylini brauzerda oching — **hamma narsa localStorage orqali ishlaydi!**

---

## 🖥️ Backend bilan ishlatish (ixtiyoriy)

Node.js o'rnatilgan bo'lsa:

```bash
npm install
node server.js
```

So'ng http://localhost:3000 ga kiring.

---

## ✨ Imkoniyatlar

- ✅ Ro'yxatdan o'tish va tizimga kirish
- ✅ Yakka vazifalar qo'shish va bajarish
- ✅ Hamkorlik vazifalar (2 kishi birga)
- ✅ Birinchi bajarganga +1 ball
- ✅ Reyting jadvali (leaderboard)
- ✅ Shaxsiy profil va statistika
- ✅ Filtrlash (yakka, hamkorlik, bajarilgan...)
- ✅ Klaviatura yorliqlari (N — yangi vazifa, Esc — yopish)
- ✅ Ko'p tab sinxronizatsiyasi

## API Endpoints (server.js)

| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/register` | Ro'yxatdan o'tish |
| POST | `/api/login` | Tizimga kirish |
| GET | `/api/users` | Barcha foydalanuvchilar |
| GET | `/api/tasks` | Barcha vazifalar |
| POST | `/api/tasks` | Yangi vazifa |
| PATCH | `/api/tasks/:id/complete` | Bajarildi deb belgilash |
| DELETE | `/api/tasks/:id` | Vazifani o'chirish |
