// AdminPanel.js
import React, { useEffect, useState } from 'react';
import { getSeats } from '../services/api.js';

export default function AdminPanel({ 
  onEnterAdminMode, 
  onExitAdminMode, 
  adminModeActive, 
  selectedSeatForAdmin, 
  onSelectSeatForAdmin,
  adminRect,
  onRegister
}) {
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    (async () => {
      const allSeats = await getSeats();
      setSeats(allSeats);
    })();
  }, []);

  const unassignedSeats = seats.filter(s => s.x === null || s.y === null || s.width === null || s.height === null);

  return (
    <div className="admin-panel">
      <h4>管理者機能</h4>
      <p>座席を選択後「座席範囲登録モード開始」で範囲を指定。</p>
      <p>範囲を何度も選び直したら「登録」で確定できます。</p>
      <select
        value={selectedSeatForAdmin || ''}
        onChange={(e) => onSelectSeatForAdmin(parseInt(e.target.value, 10))}
      >
        <option value="">-- 座席を選択 --</option>
        {unassignedSeats.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div style={{marginTop:'10px'}}>
        {!adminModeActive ? 
          <button disabled={!selectedSeatForAdmin} onClick={onEnterAdminMode}>座席範囲登録モード開始</button> :
          <button onClick={onExitAdminMode}>終了</button>
        }
      </div>
      {adminModeActive && (
        <div style={{marginTop:'10px'}}>
          <button disabled={!adminRect} onClick={onRegister}>登録</button>
        </div>
      )}
    </div>
  );
}
