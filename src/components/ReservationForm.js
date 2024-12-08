// components/ReservationForm.js
// ユーザが座席を選択した後、予約を行うためのフォームダイアログ。
// 氏名・部署を入力して"予約確定"を押すと、makeReservationが呼ばれ予約が作成される。
// visible=trueで表示され、zIndex=9999で地図上より前面に表示する。

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';

export default function ReservationForm({ visible, onClose, selectedSeats, onReserve, selectedDate }) {
  // ユーザ入力用状態変数
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  // visibleがfalseまたは選択席なしなら表示しない
  if(!visible || selectedSeats.length === 0) return null;

  const handleReserve = () => {
    // "予約確定"ボタンでonReserve呼び出し、予約実行
    onReserve({ name, department });
    // フォームリセット
    setName('');
    setDepartment('');
  };

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{
        style: { zIndex:9999 } // モーダルを最前面に
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
