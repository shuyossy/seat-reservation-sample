import React, { useState, useEffect } from 'react';
import SeatMap from './SeatMap';
import ReservationForm from './ReservationForm';
import { makeReservation, getReservationsByDate, updateSeat, cancelReservation, getSeats, getInfoOverlays, addInfoOverlay } from '../services/api';

export default function App() {
  const [selectedDate, setSelectedDate] = useState('2024-12-31');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [allSeats, setAllSeats] = useState([]);

  const [seatRegistrationMode, setSeatRegistrationMode] = useState(false);
  const [selectedSeatForRegistration, setSelectedSeatForRegistration] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});

  // 情報領域関連
  const [infoOverlays, setInfoOverlays] = useState([]);
  const [infoOverlayRegistrationMode, setInfoOverlayRegistrationMode] = useState(false);
  const [pendingInfoOverlays, setPendingInfoOverlays] = useState([]);
  // pendingInfoOverlays: [{tempId: number, name: '', x,y,width,height}, ...]
  // nameは後から入力可能にする

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
      const info = await getInfoOverlays();
      setInfoOverlays(info);
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
    setPendingAssignments(prev => ({ ...prev, [seatId]: rect }));
  };

  const handleRegisterConfirm = async () => {
    for (const seatIdStr of Object.keys(pendingAssignments)) {
      const seatId = parseInt(seatIdStr, 10);
      const rect = pendingAssignments[seatId];
      await updateSeat(seatId, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
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

  // 情報領域登録関連
  const handleInfoOverlayAreaSelected = (rect) => {
    // 新規レコード追加
    const tempId = Date.now(); // 一時的ID
    const newOverlay = { tempId, name: '', ...rect };
    setPendingInfoOverlays(prev => [...prev, newOverlay]);
  };

  const handleInfoOverlayRegisterConfirm = async () => {
    // 全てのpendingInfoOverlaysをDBへ追加
    for (const ov of pendingInfoOverlays) {
      await addInfoOverlay(ov.name, ov.x, ov.y, ov.width, ov.height);
    }
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
    const info = await getInfoOverlays();
    setInfoOverlays(info);
  };

  const handleInfoOverlayRegisterCancel = () => {
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
  };

  const handleInfoOverlayNameChange = (tempId, newName) => {
    setPendingInfoOverlays(prev => prev.map(o => o.tempId === tempId ? {...o, name: newName} : o));
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
          // 他のモード解除
          setInfoOverlayRegistrationMode(false);
          if (seatRegistrationMode) {
            handleRegisterCancel();
          } else {
            setSeatRegistrationMode(true);
          }
        }}>
          {seatRegistrationMode ? "座席登録終了" : "座席登録開始"}
        </button>

        <button style={{marginLeft:'10px'}} onClick={() => {
          // 他のモード解除
          setSeatRegistrationMode(false);
          setPendingAssignments({});
          if (infoOverlayRegistrationMode) {
            handleInfoOverlayRegisterCancel();
          } else {
            setInfoOverlayRegistrationMode(true);
          }
        }}>
          {infoOverlayRegistrationMode ? "情報領域登録終了" : "情報領域登録開始"}
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
        infoOverlays={infoOverlays}
        // 情報領域登録モード関連
        infoOverlayRegistrationMode={infoOverlayRegistrationMode}
        onInfoOverlayAreaSelected={handleInfoOverlayAreaSelected}
        pendingInfoOverlays={pendingInfoOverlays}
      />

      {!seatRegistrationMode && !infoOverlayRegistrationMode && (
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
        <div style={{ marginTop:'20px', borderTop:'1px solid #ccc', paddingTop:'10px' }}>
          <h3>座席範囲登録</h3>
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

      {infoOverlayRegistrationMode && (
        <div style={{ marginTop:'20px', borderTop:'1px solid #ccc', paddingTop:'10px' }}>
          <h3>情報領域登録</h3>
          <p>座席表上でドラッグして領域を指定してください。指定後、以下一覧で名前を入力可能です。</p>
          {pendingInfoOverlays.length === 0 && <p>仮登録中の領域はありません。</p>}
          <ul style={{ listStyle:'none', padding:0 }}>
            {pendingInfoOverlays.map(o => (
              <li key={o.tempId} style={{marginBottom:'5px'}}>
                <div>
                  <span>領域（{o.x},{o.y},{o.width}x{o.height}）</span><br />
                  <input
                    type="text"
                    placeholder="領域名を入力"
                    value={o.name}
                    onChange={e => handleInfoOverlayNameChange(o.tempId, e.target.value)}
                  />
                  {o.name === '' && <span style={{color:'red', marginLeft:'5px'}}>※名称未入力</span>}
                </div>
              </li>
            ))}
          </ul>
          <div style={{marginTop:'10px'}}>
            <button
              onClick={handleInfoOverlayRegisterConfirm}
              disabled={pendingInfoOverlays.length === 0 || pendingInfoOverlays.some(o => o.name === '')}
            >
              登録
            </button>
            <button style={{marginLeft:'10px'}} onClick={handleInfoOverlayRegisterCancel}>終了</button>
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
