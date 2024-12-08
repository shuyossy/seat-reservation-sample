// App.js
// メインコンポーネント
import React, { useState, useEffect } from 'react';
import { getSeats, getReservationsByDate, updateSeat, cancelReservation, getInfoOverlays, addInfoOverlay, makeReservation } from './services/api';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ReservationForm from './components/ReservationForm';
import MapView from './components/MapView';
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';

const theme = createTheme({
  palette: {
    primary: { main: '#4078F2' }, // 基本カラー#4078F2
    background: { default: '#fff' },
    text: { primary: '#000' }
  }
});

const detailModalPaperStyle = { zIndex:9999 };

function App() {
  // 日付、座席選択、予約フォーム表示、予約一覧、座席一覧など状態管理
  const [selectedDate, setSelectedDate] = useState('2024-12-31');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [allSeats, setAllSeats] = useState([]);

  // 座席登録モード関連
  const [seatRegistrationMode, setSeatRegistrationMode] = useState(false);
  const [selectedSeatForRegistration, setSelectedSeatForRegistration] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});

  // 情報領域登録モード関連
  const [infoOverlayRegistrationMode, setInfoOverlayRegistrationMode] = useState(false);
  const [pendingInfoOverlays, setPendingInfoOverlays] = useState([]);
  const [infoOverlays, setInfoOverlays] = useState([]);

  // 予約詳細モーダル用データ
  const [detailModalData, setDetailModalData] = useState(null);

  useEffect(() => {
    // selectedDateが変わるたびに、その日付の予約一覧を取得
    (async () => {
      const r = await getReservationsByDate(selectedDate);
      setReservations(r);
    })();
  }, [selectedDate]);

  useEffect(() => {
    // 初回マウント時に座席一覧と情報領域一覧を取得
    (async () => {
      const s = await getSeats();
      setAllSeats(s);
      const info = await getInfoOverlays();
      setInfoOverlays(info);
    })();
  }, []);

  const handleReserve = async ({ name, department }) => {
    // 予約フォームで"予約確定"時に呼ばれる
    await makeReservation(selectedSeats.map(s => s.id), selectedDate, name, department);
    setShowReservationForm(false);
    setSelectedSeats([]);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const handleCancelReservation = async (seatId) => {
    // 予約詳細モーダルからの取消処理や他箇所で利用
    await cancelReservation(seatId, selectedDate);
    const r = await getReservationsByDate(selectedDate);
    setReservations(r);
  };

  const onSeatAreaSelected = (seatId, rect) => {
    // 座席登録モードでドラッグ終了時に呼ばれ、仮登録範囲を保存
    setPendingAssignments(prev => ({...prev, [seatId]: rect}));
  };

  const handleRegisterConfirm = async () => {
    // 座席範囲登録モードで"登録完了"を押したらDB反映
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
    // 座席登録モードで"キャンセル"を押したら登録中断
    setPendingAssignments({});
    setSeatRegistrationMode(false);
    setSelectedSeatForRegistration(null);
  };

  const onInfoOverlayAreaSelected = (rect) => {
    // 情報領域登録モードでドラッグ終了時に仮登録範囲追加
    const tempId = Date.now();
    const newOverlay = { tempId, name:'', ...rect };
    setPendingInfoOverlays(prev => [...prev, newOverlay]);
  };

  const handleInfoOverlayRegisterConfirm = async () => {
    // 情報領域"登録"押下でDB反映
    for(const ov of pendingInfoOverlays) {
      await addInfoOverlay(ov.name, ov.x, ov.y, ov.width, ov.height);
    }
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
    const info = await getInfoOverlays();
    setInfoOverlays(info);
  };

  const handleInfoOverlayRegisterCancel = () => {
    // 情報領域登録"終了"押下で中断
    setPendingInfoOverlays([]);
    setInfoOverlayRegistrationMode(false);
  };

  const handleInfoOverlayNameChange = (tempId, newName) => {
    // 情報領域名入力欄の変更に対応
    setPendingInfoOverlays(prev => prev.map(o => o.tempId === tempId ? {...o, name:newName} : o));
  };

  const onShowDetailModal = (data) => {
    // 座席クリック時に予約詳細を表示するモーダル起動
    setDetailModalData(data);
  };

  const handleDetailCancelReservation = async (seatId) => {
    // 予約詳細モーダルから直接予約取消可能
    await handleCancelReservation(seatId);
    setDetailModalData(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* ヘッダー。日付選択やモード切替ボタンあり */}
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
            // 座席登録モード切替
            setInfoOverlayRegistrationMode(false);
            if(seatRegistrationMode) {
              handleRegisterCancel();
            } else {
              setSeatRegistrationMode(true);
            }
          }}>座席登録{seatRegistrationMode?'終了':'開始'}</Button>

          <Button variant={infoOverlayRegistrationMode ? "contained" : "outlined"} sx={{color:'#fff', borderColor:'#fff', ml:1}} onClick={() => {
            // 情報領域登録モード切替
            setSeatRegistrationMode(false);
            setPendingAssignments({});
            if(infoOverlayRegistrationMode) {
              handleInfoOverlayRegisterCancel();
            } else {
              setInfoOverlayRegistrationMode(true);
            }
          }}>
            情報領域登録{infoOverlayRegistrationMode?'終了':'開始'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* レイアウト:
         - 常時マップは画面中央、幅95%
         - seatRegistrationMode時：マップ下に座席一覧を85%幅で中央表示し、
           「座席範囲登録」を中央に、その右端に「登録完了」「キャンセル」ボタン配置
         - infoOverlayRegistrationMode時：マップ下に85%幅で情報領域一覧表示（前回同様）
         - 通常時：マップ下に予約フォームボタン
      */}

      {/* マップ表示部分: width:95%, 中央寄せ */}
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
        />
      </div>

      {/* 座席登録モード時の座席一覧表示:
          要件： 
          - 「座席範囲登録」を中央に配置
          - 「登録完了」「キャンセル」ボタンを右端に配置
          これを実現するため、上部にフレックスレイアウトを用意する。 */}
      {seatRegistrationMode && (
        <div style={{width:'85%', margin:'30px auto 0 auto', background:'#f8f9fa', padding:'20px', borderRadius:'4px'}}>
          {/* 上部バー: 「座席範囲登録」を中央、右端にボタン */}
          <div style={{display:'flex', alignItems:'center'}}>
            {/* flexGrow:1をもつdivで左側空間を確保、中央に文字配置のためテキストを中央寄せ */}
            <div style={{flexGrow:1, textAlign:'center'}}>
              <Typography variant="h6" gutterBottom>座席範囲登録</Typography>
            </div>
            {/* 右端にボタン配置 */}
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

          {/* ボタンとタイトルを上に置いたため、"座席範囲登録"はすでに中央に表示済み
             次に座席一覧をその下に表示 */}
          <ListGroup className="mt-3">
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

      {/* 情報領域登録モード:
         通常は前回同様に85%幅中央でリスト表示、下部に「登録」「終了」ボタン */}
      {infoOverlayRegistrationMode && !seatRegistrationMode && (
        <div style={{width:'85%', margin:'30px auto 0 auto', background:'#f8f9fa', padding:'20px', borderRadius:'4px'}}>
          <Typography variant="h6" gutterBottom>情報領域登録</Typography>
          <Typography variant="body2" gutterBottom>
            マップ上でドラッグして領域を追加。名称入力後「登録」で確定。
          </Typography>
          {pendingInfoOverlays.length === 0 && (
            <Typography variant="body2" color="text.secondary">仮登録中の領域はありません。</Typography>
          )}
          <ListGroup className="mt-2">
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

      {/* 通常モード:
         seatRegistrationModeやinfoOverlayRegistrationModeでなければ、
         選択席があれば予約フォームボタンを表示 */}
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
    </ThemeProvider>
  );
}

export default App;
