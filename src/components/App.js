import React, { useState, useEffect } from 'react';
import SeatMap from './SeatMap';
import ReservationForm from './ReservationForm';
import { makeReservation, getReservationsByDate, updateSeat, cancelReservation, getSeats } from '../services/api';

export default function App() {
  const [selectedDate, setSelectedDate] = useState('2024-12-31');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservations, setReservations] = useState([]);
  
  const [allSeats, setAllSeats] = useState([]);

  const [seatRegistrationMode, setSeatRegistrationMode] = useState(false);
  const [selectedSeatForRegistration, setSelectedSeatForRegistration] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});

  useEffect(() => {
    (async () => {
      const r = await getReservationsByDate(selectedDate);
      setReservations(r);
    })();
  }, [selectedDate]);

  useEffect(() => {
    (async () => {
      const s = await getSeats();
      setAllSeats(s);
    })();
  }, []);

  const handleReserve = async ({ name, department }) => {
    await makeReservation(selectedSeats.map(s => s.id), selectedDate, name, department);
    setShowReservationForm(false);
    setSelectedSeats([]);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const handleCancelReservation = async (seatId) => {
    await cancelReservation(seatId, selectedDate);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const handleSeatAreaSelected = (seatId, rect) => {
    // 仮登録更新
    setPendingAssignments(prev => ({
      ...prev,
      [seatId]: rect
    }));
  };

  const handleRegisterConfirm = async () => {
    for (const seatIdStr of Object.keys(pendingAssignments)) {
      const seatId = parseInt(seatIdStr, 10);
      const rect = pendingAssignments[seatId];
      await updateSeat(seatId, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      });
    }
    setPendingAssignments({});
    setSeatRegistrationMode(false);
    setSelectedSeatForRegistration(null);

    const updatedSeats = await getSeats();
    setAllSeats(updatedSeats);
  };

  const handleRegisterCancel = () => {
    setPendingAssignments({});
    setSeatRegistrationMode(false);
    setSelectedSeatForRegistration(null);
  };

  return (
    <div className="app-container">
      <h2>座席予約システム(サンプル)</h2>
      <div style={{marginBottom:'10px'}}>
        <label>日付選択: </label>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => {
          if (seatRegistrationMode) {
            handleRegisterCancel();
          } else {
            setSeatRegistrationMode(true);
          }
        }}>
          {seatRegistrationMode ? "座席登録終了" : "座席登録開始"}
        </button>
      </div>

      <SeatMap
        selectedDate={selectedDate}
        reservations={reservations}
        selectedSeats={selectedSeats}
        onSelectedSeatsChange={setSelectedSeats}
        seatRegistrationMode={seatRegistrationMode}
        selectedSeatForRegistration={selectedSeatForRegistration}
        onSeatAreaSelected={handleSeatAreaSelected}
        allSeats={allSeats}
        onCancelReservation={handleCancelReservation}
        pendingAssignments={pendingAssignments}
      />

      {/* 予約フォームを開くボタン（seatRegistrationModeがfalseのときにも利用可能） */}
      {!seatRegistrationMode && (
        <div style={{marginTop:'10px'}}>
          <button 
            onClick={() => setShowReservationForm(true)}
            disabled={selectedSeats.length === 0}
          >
            予約フォームを開く
          </button>
        </div>
      )}

      {seatRegistrationMode && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <h3>座席一覧</h3>
          <p>座席を選択→ドラッグで仮登録→「登録完了」ボタンで反映</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {allSeats.map(seat => {
              const assigned = pendingAssignments[seat.id] ? " (仮登録中)" : (seat.x !== null ? " (登録済)" : "");
              return (
                <li key={seat.id} style={{ marginBottom: '5px' }}>
                  <label>
                    <input
                      type="radio"
                      name="seatSelect"
                      value={seat.id}
                      checked={selectedSeatForRegistration === seat.id}
                      onChange={() => setSelectedSeatForRegistration(seat.id)}
                    />
                    {seat.name}{assigned}
                  </label>
                </li>
              );
            })}
          </ul>
          <div style={{marginTop:'10px'}}>
            <button 
              onClick={handleRegisterConfirm}
              disabled={Object.keys(pendingAssignments).length === 0}
            >
              登録完了
            </button>
            <button style={{marginLeft:'10px'}} onClick={handleRegisterCancel}>キャンセル</button>
          </div>
        </div>
      )}

      <ReservationForm
        visible={showReservationForm}
        onClose={() => setShowReservationForm(false)}
        selectedSeats={selectedSeats}
        onReserve={handleReserve}
        selectedDate={selectedDate}
      />
    </div>
  );
}
