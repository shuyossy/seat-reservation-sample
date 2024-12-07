// services/api.js

let seatInfo = [];

// 初期74席登録(座標なし)
for (let i = 1; i <= 74; i++) {
  seatInfo.push({ id: i, name: `Seat ${i}`, x: null, y: null, width: null, height: null });
}

let reservations = [];

// 取得
export async function getSeats() {
  return Promise.resolve(seatInfo);
}

// 座席更新：座標登録などで使用
export async function updateSeat(id, { x, y, width, height }) {
  const seat = seatInfo.find(s => s.id === id);
  if (seat) {
    seat.x = x;
    seat.y = y;
    seat.width = width;
    seat.height = height;
  }
  return Promise.resolve(seat);
}

export async function getReservationsByDate(date) {
  return Promise.resolve(reservations.filter(r => r.date === date));
}

export async function makeReservation(seatIds, date, name, department) {
  let maxId = reservations.length ? Math.max(...reservations.map(r => r.id)) : 0;
  let newEntries = seatIds.map(seatId => {
    return {
      id: ++maxId,
      seatId,
      date,
      name,
      department
    };
  });
  reservations = reservations.concat(newEntries);
  return Promise.resolve(newEntries);
}

export async function cancelReservation(seatId, date) {
  reservations = reservations.filter(r => !(r.seatId === seatId && r.date === date));
  return Promise.resolve();
}

export async function getReservationDetail(seatId, date) {
  const r = reservations.find(rv => rv.seatId === seatId && rv.date === date);
  if(!r) return Promise.resolve(null);
  return Promise.resolve(r);
}
