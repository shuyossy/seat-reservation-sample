// services/api.js
// バックエンドAPIをモック化したファイル。
// 本番ではサーバーと通信しDBからデータ取得・更新するが、
// 現在はメモリ上のデータで擬似的に同等の操作を実現している。

let seatInfo = [];
// 74席分の初期データを用意する。座標はまだ未設定。
for (let i = 1; i <= 74; i++) {
  seatInfo.push({ id: i, name: `Seat ${i}`, x: null, y: null, width: null, height: null });
}

let reservations = []; 
// 予約情報を保持する配列。{id, seatId, date, name, department}を要素として持つ。

let infoOverlays = [
  // 情報領域初期データ。後から管理者によって追加可能。
  { id: 1, name: "総務本部領域", x: 50, y: 50, width: 200, height: 100 },
  { id: 2, name: "開発部門エリア", x: 300, y: 200, width: 150, height: 150 }
];

export async function getSeats() {
  // 座席一覧を返す
  return Promise.resolve(seatInfo);
}

export async function updateSeat(id, { x, y, width, height }) {
  // 特定IDの座席範囲を更新
  const seat = seatInfo.find(s => s.id === id);
  if (seat) {
    seat.x = x; seat.y = y; seat.width = width; seat.height = height;
  }
  return Promise.resolve(seat);
}

export async function getReservationsByDate(date) {
  // 指定日付に該当する予約一覧を返す
  return Promise.resolve(reservations.filter(r => r.date === date));
}

export async function makeReservation(seatIds, date, name, department) {
  // 複数座席に対する予約をまとめて作成
  let maxId = reservations.length ? Math.max(...reservations.map(r => r.id)) : 0;
  let newEntries = seatIds.map(seatId => {
    return { id: ++maxId, seatId, date, name, department };
  });
  reservations = reservations.concat(newEntries);
  return Promise.resolve(newEntries);
}

export async function cancelReservation(seatId, date) {
  // 指定座席と日付の予約を取り消し
  reservations = reservations.filter(r => !(r.seatId === seatId && r.date === date));
  return Promise.resolve();
}

export async function getReservationDetail(seatId, date) {
  // 特定席・日付の予約詳細情報(氏名、部署)を取得
  const r = reservations.find(rv => rv.seatId === seatId && rv.date === date);
  if(!r) return Promise.resolve(null);
  return Promise.resolve(r);
}

export async function getInfoOverlays() {
  // 情報領域一覧を返す
  return Promise.resolve(infoOverlays);
}

export async function addInfoOverlay(name, x, y, width, height) {
  // 新たな情報領域を追加
  const newId = infoOverlays.length ? Math.max(...infoOverlays.map(o => o.id)) + 1 : 1;
  const newOverlay = { id: newId, name, x, y, width, height };
  infoOverlays.push(newOverlay);
  return Promise.resolve(newOverlay);
}
