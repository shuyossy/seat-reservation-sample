// components/SeatDetailModal.js
import React from 'react';

export default function SeatDetailModal({ visible, onClose, seatDetail, onCancelReservation }) {
  if(!visible || !seatDetail) return null;
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>予約詳細</h3>
        <p>席名: {seatDetail.seatName}</p>
        <p>氏名: {seatDetail.name}</p>
        <p>部署: {seatDetail.department}</p>
        <div style={{ marginTop: '10px' }}>
          <button onClick={onClose}>閉じる</button>
          <button onClick={() => onCancelReservation(seatDetail.seatId)}>予約取消</button>
        </div>
      </div>
    </div>
  );
}
