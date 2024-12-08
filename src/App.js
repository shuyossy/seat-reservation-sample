// App.js
// アプリ全体のメインコンポーネントです。
// ユーザ操作(日付選択、座席範囲登録、地割登録、予約フォーム表示、削除確認ダイアログなど)をまとめています。

import React, { useState, useEffect } from 'react';
import { getSeats, getReservationsByDate, updateSeat, cancelReservation, getInfoOverlays, addInfoOverlay, makeReservation, removeInfoOverlay } from './services/api';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ReservationForm from './components/ReservationForm';
import MapView from './components/MapView';
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';

// テーマ定義：基本色#4078F2、背景白、文字黒
const theme = createTheme({
  palette: {
    primary: { main: '#4078F2' },
    background: { default: '#fff' },
    text: { primary: '#000' }
  }
});

const detailModalPaperStyle = { zIndex:9999 };

function App() {
  // 日付、座席選択など基本状態管理
  const [selectedDate, setSelectedDate] = useState('2024-12-31');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [allSeats, setAllSeats] = useState([]);

  // 座席範囲登録モード
  const [seatRegistrationMode, setSeatRegistrationMode] = useState(false);
  const [selectedSeatForRegistration, setSelectedSeatForRegistration] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});

  // 情報領域(地割)登録モード
  const [infoOverlayRegistrationMode, setInfoOverlayRegistrationMode] = useState(false);
  const [pendingInfoOverlays, setPendingInfoOverlays] = useState([]);
  const [infoOverlays, setInfoOverlays] = useState([]);

  // 予約詳細モーダル表示用状態
  const [detailModalData, setDetailModalData] = useState(null);

  // 情報領域削除確認用
  const [selectedInfoOverlayForDelete, setSelectedInfoOverlayForDelete] = useState(null);

  useEffect(() => {
    // 日付変更時、その日付の予約一覧取得
    (async () => {
      const r = await getReservationsByDate(selectedDate);
      setReservations(r);
    })();
  }, [selectedDate]);

  useEffect(() => {
    // 初回表示時、座席一覧と情報領域一覧を取得
    (async () => {
      const s = await getSeats();
      setAllSeats(s);
      const info = await getInfoOverlays();
      setInfoOverlays(info);
    })();
  }, []);

  const handleReserve = async ({ name, department }) => {
    // 予約フォームで"予約確定"押下時の予約作成処理
    await makeReservation(selectedSeats.map(s => s.id), selectedDate, name, department);
    setShowReservationForm(false);
    setSelectedSeats([]);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const handleCancelReservation = async (seatId) => {
    // 予約取消処理
    await cancelReservation(seatId, selectedDate);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const onSeatAreaSelected = (seatId, rect) => {
    // 座席範囲ドラッグ完了時に呼ばれる
    // pendingAssignmentsに即時反映し、これで座席表示が即座に更新されます。
    setPendingAssignments(prev => ({...prev, [seatId]: rect}));
  };

  const handleRegisterConfirm = async () => {
    // 座席範囲登録時の"登録完了"ボタン押下
    // pendingAssignmentsにある範囲をDB反映
    for(const seatIdStr of Object.keys(pendingAssignments)) {
      const seatId = parseInt(seatIdStr,10);
      const rect = pendingAssignments[seatId];
      await updateSeat(seatId, {x:rect.x, y:rect.y, width:rect.width, height:rect.height});
    }
    setPendingAssignments({});
    setSeatRegistrationMode(false);
    setSelectedSeatForRegistration(null);
    const updatedSeats = await getSeats();
    setAllSeats(updatedSeats);
  };

  const handleRegisterCancel = () => {
    // 座席範囲登録"キャンセル"ボタン押下
    setPendingAssignments({});
    setSeatRegistrationMode(false);
    setSelectedSeatForRegistration(null);
  };

  const onInfoOverlayAreaSelected = (rect) => {
    // 情報領域(地割)ドラッグ終了時に仮登録データ追加
    const tempId = Date.now();
    const newOverlay = { tempId, name:'', ...rect };
    setPendingInfoOverlays(prev => [...prev, newOverlay]);
  };

  const handleInfoOverlayRegisterConfirm = async () => {
    // 地割登録"登録"ボタンで仮登録をDB反映
    for(const ov of pendingInfoOverlays) {
      await addInfoOverlay(ov.name, ov.x, ov.y, ov.width, ov.height);
    }
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
    const info = await getInfoOverlays();
    setInfoOverlays(info);
  };

  const handleInfoOverlayRegisterCancel = () => {
    // 地割登録"終了"で中断
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
  };

  const handleInfoOverlayNameChange = (tempId, newName) => {
    // 仮登録情報領域の名称変更
    setPendingInfoOverlays(prev => prev.map(o => o.tempId === tempId ? {...o, name:newName} : o));
  };

  const onShowDetailModal = (data) => {
    // 予約詳細モーダル表示
    setDetailModalData(data);
  };

  const handleDetailCancelReservation = async (seatId) => {
    // 詳細モーダルから予約取消実行
    await handleCancelReservation(seatId);
    setDetailModalData(null);
  };

  const onInfoOverlayClick = (overlay) => {
    // 地割登録モード中、既存情報領域クリックで削除確認ダイアログ表示
    setSelectedInfoOverlayForDelete(overlay);
  };

  const handleDeleteOverlayConfirm = async () => {
    // 情報領域削除確認ダイアログで"削除"を押した場合
    if(selectedInfoOverlayForDelete) {
      await removeInfoOverlay(selectedInfoOverlayForDelete.id);
      const info = await getInfoOverlays();
      setInfoOverlays(info);
    }
    setSelectedInfoOverlayForDelete(null);
  };

  const handleDeleteOverlayCancel = () => {
    // 情報領域削除確認ダイアログで"キャンセル"
    setSelectedInfoOverlayForDelete(null);
  };

  // ボタン名は押しても名称変更しない
  const seatRegButtonLabel = "座席範囲登録";
  const infoRegButtonLabel = "地割登録";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* ヘッダー：日付選択、座席範囲登録、地割登録ボタン */}
      <AppBar position="static" sx={{background:'#4078F2'}}>
        <Toolbar>
          <Typography variant="h6" sx={{flexGrow:1, color:'#fff'}}>
            座席予約システム
          </Typography>
          <TextField
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ background:'#fff', borderRadius:1, mr:2 }}
          />
          <Button variant={seatRegistrationMode ? "contained" : "outlined"} sx={{color:'#fff', borderColor:'#fff'}} onClick={() => {
            // 座席範囲登録モード切替
            setInfoOverlayRegistrationMode(false);
            if(seatRegistrationMode) {
              handleRegisterCancel();
            } else {
              setSeatRegistrationMode(true);
            }
          }}>{seatRegButtonLabel}</Button>

          <Button variant={infoOverlayRegistrationMode ? "contained" : "outlined"} sx={{color:'#fff', borderColor:'#fff', ml:1}} onClick={() => {
            // 地割登録モード切替
            setSeatRegistrationMode(false);
            setPendingAssignments({});
            if(infoOverlayRegistrationMode) {
              handleInfoOverlayRegisterCancel();
            } else {
              setInfoOverlayRegistrationMode(true);
            }
          }}>
            {infoRegButtonLabel}
          </Button>
        </Toolbar>
      </AppBar>

      {/* マップ表示：幅95%中央寄せ */}
      <div style={{width:'95%', margin:'0 auto', marginTop:'20px'}}>
        <MapView
          selectedDate={selectedDate}
          reservations={reservations}
          selectedSeats={selectedSeats}
          onSelectedSeatsChange={setSelectedSeats}
          seatRegistrationMode={seatRegistrationMode}
          selectedSeatForRegistration={selectedSeatForRegistration}
          onSeatAreaSelected={onSeatAreaSelected}
          allSeats={allSeats}
          onCancelReservation={handleCancelReservation}
          pendingAssignments={pendingAssignments}
          infoOverlays={infoOverlays}
          infoOverlayRegistrationMode={infoOverlayRegistrationMode}
          onInfoOverlayAreaSelected={onInfoOverlayAreaSelected}
          pendingInfoOverlays={pendingInfoOverlays}
          onShowDetailModal={onShowDetailModal}
          onInfoOverlayClick={onInfoOverlayClick}
        />
      </div>

      {/* 座席登録モード時の座席一覧表示 */}
      {seatRegistrationMode && (
        <div style={{width:'85%', margin:'30px auto 0 auto', background:'#f8f9fa', padding:'20px', borderRadius:'4px'}}>
          <div style={{display:'flex', alignItems:'center'}}>
            <div style={{flexGrow:1, textAlign:'center'}}>
              <Typography variant="h6" gutterBottom>座席範囲登録</Typography>
            </div>
            <div style={{textAlign:'right'}}>
              <Button 
                variant="contained"
                color="primary"
                onClick={handleRegisterConfirm}
                disabled={Object.keys(pendingAssignments).length === 0}
              >
                登録完了
              </Button>
              <Button onClick={handleRegisterCancel} variant="text" sx={{ml:1}}>キャンセル</Button>
            </div>
          </div>

          {/* 座席一覧スクロール対応 */}
          <ListGroup className="mt-3" style={{maxHeight:'300px', overflowY:'auto'}}>
            {allSeats.map(seat => {
              const assigned = pendingAssignments[seat.id] ? " (仮登録中)" : (seat.x !== null ? " (登録済)" : "");
              return (
                <ListGroup.Item
                  key={seat.id}
                  action
                  onClick={()=>setSelectedSeatForRegistration(seat.id)}
                  className={selectedSeatForRegistration===seat.id?'active':''}
                >
                  {seat.name}{assigned}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>
      )}

      {/* 地割登録モード時の情報領域一覧表示 */}
      {infoOverlayRegistrationMode && !seatRegistrationMode && (
        <div style={{width:'85%', margin:'30px auto 0 auto', background:'#f8f9fa', padding:'20px', borderRadius:'4px'}}>
          <Typography variant="h6" gutterBottom>情報領域登録</Typography>
          <Typography variant="body2" gutterBottom>
            マップ上でドラッグして領域を追加。名称入力後「登録」で確定。
          </Typography>
          {pendingInfoOverlays.length === 0 && (
            <Typography variant="body2" color="text.secondary">仮登録中の領域はありません。</Typography>
          )}
          <ListGroup className="mt-2" style={{maxHeight:'300px', overflowY:'auto'}}>
            {pendingInfoOverlays.map(o => (
              <ListGroup.Item key={o.tempId}>
                領域({o.x.toFixed(1)}, {o.y.toFixed(1)}, {o.width.toFixed(1)}x{o.height.toFixed(1)})
                <Form.Control
                  type="text"
                  placeholder="領域名"
                  value={o.name}
                  onChange={e => handleInfoOverlayNameChange(o.tempId, e.target.value)}
                  className="mt-2"
                />
                {o.name === '' && <Typography variant="body2" color="error">※名称未入力</Typography>}
              </ListGroup.Item>
            ))}
          </ListGroup>
          <div className="text-end mt-2">
            <Button
              variant="contained"
              color="primary"
              onClick={handleInfoOverlayRegisterConfirm}
              disabled={pendingInfoOverlays.length === 0 || pendingInfoOverlays.some(o => o.name === '')}
            >
              登録
            </Button>
            <Button onClick={handleInfoOverlayRegisterCancel} variant="text" sx={{ml:1}}>終了</Button>
          </div>
        </div>
      )}

      {/* 通常モード時の予約フォームボタン表示 */}
      {!seatRegistrationMode && !infoOverlayRegistrationMode && (
        <div className="text-end mt-2" style={{width:'95%', margin:'0 auto'}}>
          <Button
            variant="contained"
            color="primary"
            disabled={selectedSeats.length === 0}
            onClick={() => setShowReservationForm(true)}
          >
            予約フォームを開く
          </Button>
        </div>
      )}

      {/* 予約フォームダイアログ */}
      <ReservationForm
        visible={showReservationForm}
        onClose={() => setShowReservationForm(false)}
        selectedSeats={selectedSeats}
        onReserve={handleReserve}
        selectedDate={selectedDate}
      />

      {/* 予約詳細モーダル */}
      {detailModalData && (
        <Dialog open={true} onClose={()=>setDetailModalData(null)} maxWidth="sm" fullWidth
          PaperProps={{style: detailModalPaperStyle}}
        >
          <DialogTitle>予約詳細</DialogTitle>
          <DialogContent dividers>
            <Typography>席名: {detailModalData.seatName}</Typography>
            <Typography>氏名: {detailModalData.name}</Typography>
            <Typography>部署: {detailModalData.department}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setDetailModalData(null)} variant="outlined">閉じる</Button>
            <Button onClick={()=>handleDetailCancelReservation(detailModalData.seatId)} variant="contained" color="error">予約取消</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 情報領域削除確認ダイアログ */}
      {selectedInfoOverlayForDelete && (
        <Dialog open={true} onClose={handleDeleteOverlayCancel} maxWidth="xs" fullWidth
          PaperProps={{style: { zIndex:9999 }}}
        >
          <DialogTitle>情報領域削除確認</DialogTitle>
          <DialogContent dividers>
            <Typography>
              「{selectedInfoOverlayForDelete.name}」を削除しますか？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteOverlayCancel} variant="outlined">キャンセル</Button>
            <Button onClick={handleDeleteOverlayConfirm} variant="contained" color="error">削除</Button>
          </DialogActions>
        </Dialog>
      )}
    </ThemeProvider>
  );
}

export default App;
