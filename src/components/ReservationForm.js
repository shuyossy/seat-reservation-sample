// components/ReservationForm.js
// 座席予約フォームを表示するダイアログコンポーネント。
// 選択した座席と日付を表示し、氏名・部署を入力した上で"予約確定"で予約を作成します。
// zIndexを9999に設定し、マップより前面で表示します。

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';

export default function ReservationForm({ visible, onClose, selectedSeats, onReserve, selectedDate }) {
  // 氏名と部署を入力するためのstate
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  // visibleがfalseまたは選択席が無い場合は表示しない
  if(!visible || selectedSeats.length === 0) return null;

  const handleReserve = () => {
    // "予約確定"クリック時にonReserveコールバックで予約作成
    onReserve({ name, department });
    // 入力値リセット
    setName('');
    setDepartment('');
  };

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{
        style: { zIndex:9999 } // ダイアログを最前面
      }}
    >
      <DialogTitle>座席予約フォーム</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {selectedDate} の予約
        </Typography>
        <Typography variant="body2" gutterBottom>
          選択席: {selectedSeats.map(s => s.name).join(', ')}
        </Typography>
        <TextField
          label="氏名"
          fullWidth
          margin="normal"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <TextField
          label="部署"
          fullWidth
          margin="normal"
          value={department}
          onChange={e => setDepartment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReserve} variant="contained" color="primary">予約確定</Button>
        <Button onClick={onClose} variant="outlined">閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
