# To'lov Usullari (Payment Methods)

## Umumiy ma'lumot

Ushbu funksiya to'lovlarni yaratish va boshqarishda qaysi to'lov usulidan foydalanilganligini belgilash imkonini beradi.

## To'lov usullari ro'yxati

Tizimda quyidagi to'lov usullari qo'llab-quvvatlanadi:

1. **Naqd pul (CASH)** - Naqd pul orqali to'lov
2. **Bank o'tkazmasi (BANK_TRANSFER)** - Bank orqali pul o'tkazma
3. **Click** - Click to'lov tizimi
4. **Payme** - Payme to'lov tizimi
5. **Uzum** - Uzum Bank to'lov tizimi
6. **Humo** - Humo karta orqali to'lov
7. **Boshqa (OTHER)** - Boshqa to'lov usullari

## Qanday ishlatiladi?

### 1. To'lov yaratish

Teacher yoki Admin to'lov yaratayotganda, to'lov usulini tanlashi mumkin:

```typescript
const paymentData = {
  amount: 300000,
  groupId: 123,
  studentId: 456,
  paymentMethod: 'cash', // yoki 'click', 'payme', va boshqalar
};
```

Frontend da CreatePaymentForm komponentida to'lov usulini tanlash uchun select element mavjud.

### 2. Oylik to'lovni yig'ish

Teacher/Admin oylik to'lovni yig'ishda ham to'lov usulini belgilashi mumkin:

```typescript
const collectData = {
  studentId: 456,
  groupId: 123,
  amount: 300000,
  month: '2026-02',
  paymentMethod: 'click', // To'lov usuli
  note: 'Fevral oyining to\'lovi',
};

await paymentService.collectMonthlyPayment(collectData);
```

### 3. To'lovlarni ko'rish

PaymentTable komponentida to'lov usuli avtomatik ko'rsatiladi:
- Desktop view: alohida ustunda
- Mobile view: to'lov detallari ichida

## Backend API

### Payment Entity

```typescript
export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  HUMO = 'humo',
  OTHER = 'other',
}

@Entity('payments')
export class Payment {
  // ... boshqa fieldlar
  
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod: PaymentMethod;
}
```

### MonthlyPaymentTransaction Entity

Har bir to'lov transaksiyasi (oylik to'lovlar uchun) ham to'lov usulini saqlaydi:

```typescript
@Entity('monthly_payment_transactions')
export class MonthlyPaymentTransaction {
  // ... boshqa fieldlar
  
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod: PaymentMethod | null;
}
```

### API Endpoints

#### 1. To'lov yaratish
```
POST /payments
```

Request body:
```json
{
  "amount": 300000,
  "groupId": 123,
  "studentId": 456,
  "paymentMethod": "cash",
  "description": "Fevral oyi uchun to'lov"
}
```

#### 2. Oylik to'lov yig'ish
```
POST /payments/billing/collect
```

Request body:
```json
{
  "studentId": 456,
  "groupId": 123,
  "amount": 300000,
  "month": "2026-02",
  "paymentMethod": "click",
  "note": "Fevral oyining to'lovi"
}
```

#### 3. To'lov tarixini ko'rish
```
GET /payments/billing/monthly/:id/history
```

Response:
```json
[
  {
    "id": 1,
    "amount": 150000,
    "note": "Qisman to'lov",
    "paymentMethod": "cash",
    "paidAt": "2026-02-01T10:00:00Z",
    "createdAt": "2026-02-01T10:00:00Z",
    "createdByUserId": 789
  }
]
```

## Migration

Database ga paymentMethod ustunini qo'shish uchun migration yaratilgan:

```bash
# Migration avtomatik ishga tushadi backend start bo'lganda
npm run migration:run
```

Migration quyidagi o'zgarishlarni amalga oshiradi:
1. `payment_method_enum` enum type yaratadi
2. `payments` jadvaliga `paymentMethod` ustuni qo'shadi
3. `monthly_payment_transactions` jadvaliga `paymentMethod` ustuni qo'shadi

## Frontend Components

### CreatePaymentForm
To'lov usulini tanlash uchun select elementi qo'shilgan:
- Teacher/Admin to'lov yaratishda to'lov usulini tanlashi mumkin
- Ixtiyoriy field - bo'sh qoldirilishi mumkin

### PaymentTable
To'lov usulini ko'rsatish:
- Desktop: alohida "To'lov usuli" ustuni
- Mobile: card ichida "To'lov usuli" qatori
- Agar to'lov usuli belgilanmagan bo'lsa, "-" ko'rsatiladi

## Misol kod

### React komponentda to'lov yaratish

```tsx
import { PaymentMethod } from '../../types/payment';

const handleCreatePayment = async () => {
  const paymentData = {
    amount: 300000,
    groupId: selectedGroup.id,
    studentId: selectedStudent.id,
    paymentMethod: PaymentMethod.CLICK,
    description: 'Fevral oyi uchun to'lov',
  };
  
  await paymentService.createPayment(paymentData);
};
```

### To'lov usulini display qilish

```tsx
const getPaymentMethodLabel = (method?: PaymentMethod) => {
  if (!method) return '-';
  
  const labels = {
    [PaymentMethod.CASH]: 'Naqd pul',
    [PaymentMethod.BANK_TRANSFER]: 'Bank o\'tkazmasi',
    [PaymentMethod.CLICK]: 'Click',
    [PaymentMethod.PAYME]: 'Payme',
    [PaymentMethod.UZUM]: 'Uzum',
    [PaymentMethod.HUMO]: 'Humo',
    [PaymentMethod.OTHER]: 'Boshqa',
  };
  
  return labels[method] || method;
};
```

## Testing

Migration ni test qilish:
```bash
npm run migration:run
npm run migration:revert  # rollback uchun
```

Backend API ni test qilish:
```bash
# To'lov yaratish
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 300000,
    "groupId": 123,
    "studentId": 456,
    "paymentMethod": "click"
  }'
```

## Xulosa

To'lov usullari funksiyasi to'lovlarni aniqroq boshqarish va hisobot olish imkonini beradi. Bu funksiya:
- ✅ Ixtiyoriy - majburiy emas
- ✅ Legacy to'lovlar bilan mos keladi (paymentMethod null bo'lishi mumkin)
- ✅ Oylik to'lovlar va oddiy to'lovlar uchun ishlaydi
- ✅ To'lov tarixida saqlanadi
- ✅ Frontend da ko'rsatiladi

Keyingi qadamlar:
- To'lov usullari bo'yicha statistika va hisobotlar qo'shish
- To'lov usuli bo'yicha filter qilish
- Har bir guruh yoki markaz uchun default to'lov usulini belgilash
