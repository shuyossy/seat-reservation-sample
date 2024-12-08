// services/api.js
// バックエンド連携を想定したモックAPIを実装しています。
// 現在はメモリ上で座席や予約、情報領域を保持し、非同期処理(Promise)を用いて擬似的にAPIアクセスを再現します。

let seatInfo = [];
// seatInfoには全座席情報を格納します。ここでは74席分を初期登録します。
for (let i = 1; i <= 74; i++) {
  seatInfo.push({ id: i, name: `Seat ${i}`, x: null, y: null, width: null, height: null });
}

let reservations = [];
// reservationsには予約情報を格納します。{id, seatId, date, name, department}等を保持します。

let infoOverlays = [
  // infoOverlaysには情報領域(地割)データを保持します。
  { id: 1, name: "総務本部領域", x: 50, y: 50, width: 200, height: 100 },
  { id: 2, name: "開発部門エリア", x: 300, y: 200, width: 150, height: 150 }
];

export async function getSeats() {
  // 全座席一覧を取得して返す
  return Promise.resolve(seatInfo);
}

export async function updateSeat(id, { x, y, width, height }) {
  // 指定IDの座席の座標・範囲情報を更新します。
  // 登録済み座席でも、この関数で上書き可能です。
  const seat = seatInfo.find(s => s.id === id);
  if (seat) {
    seat.x = x; seat.y = y; seat.width = width; seat.height = height;
  }
  return Promise.resolve(seat);
}

export async function getReservationsByDate(date) {
  // 指定日付に紐づく予約情報の一覧を返します。
  return Promise.resolve(reservations.filter(r => r.date === date));
}

export async function makeReservation(seatIds, date, name, department) {
  // 複数の座席を一度に予約します。
  let maxId = reservations.length ? Math.max(...reservations.map(r => r.id)) : 0;
  let newEntries = seatIds.map(seatId => {
    return { id: ++maxId, seatId, date, name, department };
  });
  reservations = reservations.concat(newEntries);
  return Promise.resolve(newEntries);
}

export async function cancelReservation(seatId, date) {
  // 指定座席と日付の予約をキャンセルします。
  reservations = reservations.filter(r => !(r.seatId === seatId && r.date === date));
  return Promise.resolve();
}

export async function getReservationDetail(seatId, date) {
  // 特定座席と日付の予約詳細情報(予約者名、部署)を返します。
  const r = reservations.find(rv => rv.seatId === seatId && rv.date === date);
  if(!r) return Promise.resolve(null);
  return Promise.resolve(r);
}

export async function getInfoOverlays() {
  // 情報領域一覧(地割)を返します。
  return Promise.resolve(infoOverlays);
}

export async function addInfoOverlay(name, x, y, width, height) {
  // 新規情報領域を追加します。
  const newId = infoOverlays.length ? Math.max(...infoOverlays.map(o => o.id)) + 1 : 1;
  const newOverlay = { id: newId, name, x, y, width, height };
  infoOverlays.push(newOverlay);
  return Promise.resolve(newOverlay);
}

export async function removeInfoOverlay(id) {
  // 指定IDの情報領域を削除します。
  infoOverlays = infoOverlays.filter(o => o.id !== id);
  return Promise.resolve();
}
