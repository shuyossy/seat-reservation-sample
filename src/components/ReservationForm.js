// ReservationForm.js
import React, { useState } from 'react';

export default function ReservationForm({ visible, onClose, selectedSeats, onReserve, selectedDate }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  
  if(!visible || selectedSeats.length === 0) return null;

  const handleReserve = () => {
    onReserve({ name, department });
    setName('');
    setDepartment('');
  };

  return (
    <div className="modal-backdrop" style={styles.backdrop}>
      <div style={styles.modal}>
        <h3>予約フォーム</h3>
        <p>{selectedDate} の予約</p>
        <p>選択席: {selectedSeats.map(s => s.name).join(', ')}</p>
        <div>
          <label>氏名：</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>部署：</label>
          <input value={department} onChange={e => setDepartment(e.target.value)} />
        </div>
        <div style={{marginTop:'10px'}}>
          <button onClick={handleReserve}>予約確定</button>
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position:'fixed', 
    top:0, 
    left:0, 
    width:'100%', 
    height:'100%', 
    background:'rgba(0,0,0,0.3)', 
    display:'flex', 
    justifyContent:'center', 
    alignItems:'center',
    zIndex: 9999  // ここでz-indexを高めに設定
  },
  modal: {
    background:'#fff', 
    padding:'20px', 
    borderRadius:'4px', 
    minWidth:'300px'
  }
};
