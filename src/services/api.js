// services/api.js

let seatInfo = [];
for (let i = 1; i <= 74; i++) {
  seatInfo.push({ id: i, name: `Seat ${i}`, x: null, y: null, width: null, height: null });
}

let reservations = [];

let infoOverlays = [];

export async function getSeats() {
  return Promise.resolve(seatInfo);
}

export async function updateSeat(id, { x, y, width, height }) {
  const seat = seatInfo.find(s => s.id === id);
  if (seat) {
    seat.x = x; seat.y = y; seat.width = width; seat.height = height;
  }
  return Promise.resolve(seat);
}

export async function getReservationsByDate(date) {
  return Promise.resolve(reservations.filter(r => r.date === date));
}

export async function makeReservation(seatIds, date, name, department) {
  let maxId = reservations.length ? Math.max(...reservations.map(r => r.id)) : 0;
  let newEntries = seatIds.map(seatId => {
    return { id: ++maxId, seatId, date, name, department };
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

export async function getInfoOverlays() {
  return Promise.resolve(infoOverlays);
}

// 新規情報領域追加
export async function addInfoOverlay(name, x, y, width, height) {
  const newId = infoOverlays.length ? Math.max(...infoOverlays.map(o => o.id)) + 1 : 1;
  const newOverlay = { id: newId, name, x, y, width, height };
  infoOverlays.push(newOverlay);
  return Promise.resolve(newOverlay);
}
