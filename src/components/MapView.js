// components/MapView.js
// react-leafletで座席表を表示し、座席クリックで予約詳細表示、
// ドラッグで範囲指定、情報領域表示などを行うコンポーネント。
// このコードは幅や色などはApp側から制御される想定。
// UI以外の処理(ドラッグ範囲取得、予約詳細取得など)も丁寧にコメント。

import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Rectangle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MAP_WIDTH, MAP_HEIGHT, BACKGROUND_IMAGE_URL } from '../config.js';
import { getReservationDetail } from '../services/api.js';

// 地図全体の境界
const bounds = [[0,0], [MAP_HEIGHT, MAP_WIDTH]]; 

// マップのインタラクション(ドラッグ、ズーム)を無効化/有効化するコンポーネント
function DisableMapInteractions({ disabled }) {
  const map = useMap();
  useEffect(() => {
    if (disabled) {
      // 登録モード中はマップ移動を無効化して、範囲選択に集中できるようにする
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.keyboard.disable();
    } else {
      // 通常時はマップ操作を有効
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.keyboard.enable();
    }
  }, [disabled, map]);

  return null;
}

// 座席範囲や情報領域のドラッグによる範囲選択を処理するコンポーネント
function MapEventHandler({
  seatRegistrationMode, 
  selectedSeatForRegistration, 
  infoOverlayRegistrationMode,
  dragging,
  setDragging, 
  setDragStart, 
  setTempRect,
  tempRect,
  dragStart,
  onSeatAreaSelected,
  onInfoOverlayAreaSelected
}) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();

    function onMouseDown(e) {
      // 座席登録モードで座席選択済み、または情報領域登録モードのときに範囲選択開始
      if ((seatRegistrationMode && selectedSeatForRegistration) || infoOverlayRegistrationMode) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // コンテナ内座標からマップ上のlatlng取得
        const latlng = map.containerPointToLatLng([x,y]);
        setDragging(true);
        setDragStart(latlng);
      }
    }

    function onMouseMove(e) {
      // ドラッグ中かつマウスボタン押下中は矩形範囲更新
      if (dragging && dragStart && e.buttons === 1) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const latlng = map.containerPointToLatLng([x,y]);
        const newRect = createRectFromPoints(dragStart, latlng);
        setTempRect(newRect);
      }
    }

    function onMouseUp(e) {
      // ドラッグ終了時、tempRectがあれば範囲確定
      if (dragging && tempRect) {
        if (seatRegistrationMode && selectedSeatForRegistration) {
          // 座席範囲決定
          onSeatAreaSelected(selectedSeatForRegistration, tempRect);
        } else if (infoOverlayRegistrationMode) {
          // 情報領域範囲決定
          onInfoOverlayAreaSelected(tempRect);
        }
      }
      // 状態リセット
      setDragging(false);
      setDragStart(null);
      setTempRect(null);
    }

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
    };
  }, [
    map, dragging, dragStart, tempRect,
    seatRegistrationMode, selectedSeatForRegistration,
    infoOverlayRegistrationMode,
    setDragging, setDragStart, setTempRect,
    onSeatAreaSelected, onInfoOverlayAreaSelected
  ]);

  return null;
}

function createRectFromPoints(p1, p2) {
  // 2点のlatlngから矩形範囲(x,y,width,height)を求める
  // p1,p2はlat(lng),lng(lat)で座標表現されるがCRS.Simpleを使うので単純なx,y扱い
  const x1 = p1.lng; const y1 = p1.lat;
  const x2 = p2.lng; const y2 = p2.lat;
  const x = Math.min(x1,x2);
  const y = Math.min(y1,y2);
  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);
  return { x, y, width, height };
}

export default function MapView({
  selectedDate,
  reservations,
  selectedSeats, onSelectedSeatsChange,
  seatRegistrationMode, selectedSeatForRegistration, onSeatAreaSelected,
  allSeats,
  onCancelReservation,
  pendingAssignments,
  infoOverlays,
  infoOverlayRegistrationMode,
  onInfoOverlayAreaSelected,
  pendingInfoOverlays,
  onShowDetailModal
}) {
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [tempRect, setTempRect] = useState(null);

  // 指定日付で予約済みか判定
  const isReserved = (seat) => reservations.some(r => r.seatId === seat.id && r.date === selectedDate);
  // 座席の予約詳細を取得
  const getReservationForSeat = (seat) => reservations.find(r => r.seatId === seat.id && r.date === selectedDate);

  const handleSeatClick = async (seat) => {
    // 座席登録モードや情報領域登録モード中は座席クリック無効
    if (seatRegistrationMode || infoOverlayRegistrationMode) return;

    const reserved = isReserved(seat);
    if (reserved) {
      // 予約済み座席をクリックで詳細表示
      const detail = await getReservationDetail(seat.id, selectedDate);
      onShowDetailModal({
        seatId: seat.id,
        seatName: seat.name,
        name: detail.name,
        department: detail.department
      });
    } else {
      // 未予約席は選択状態をトグル
      let newSelected;
      if (selectedSeats.find(s => s.id === seat.id)) {
        newSelected = selectedSeats.filter(ss => ss.id !== seat.id);
      } else {
        newSelected = [...selectedSeats, seat];
      }
      onSelectedSeatsChange(newSelected);
    }
  };

  // 座席表示情報(仮登録中はpendingRect優先)
  const getSeatDisplayInfo = (seat) => {
    const pendingRect = pendingAssignments[seat.id];
    if (pendingRect) {
      return { x: pendingRect.x, y: pendingRect.y, width: pendingRect.width, height: pendingRect.height, isPending: true };
    } else if (seat.x != null && seat.y != null && seat.width != null && seat.height != null) {
      return { x: seat.x, y: seat.y, width: seat.width, height: seat.height, isPending: false };
    }
    return null;
  };

  // 座席背景色決定
  const seatFillColor = (seat, disp) => {
    const reserved = isReserved(seat);
    const selected = selectedSeats.some(s => s.id === seat.id);
    if (reserved) return '#ff9999'; 
    if (selected) return '#99ff99';
    return 'transparent';
  };

  // 座席テキスト決定
  const seatDisplayText = (seat, disp) => {
    const reserved = isReserved(seat);
    const reservation = getReservationForSeat(seat);
    const selected = selectedSeats.some(s => s.id === seat.id);

    let txt = seat.name;
    if (reserved && reservation) {
      txt = `${seat.name}\n${reservation.name}`;
    } else if (disp.isPending) {
      txt = `${seat.name}\n(未確定)`;
    } else if (selected && !reserved) {
      txt = `${seat.name}\n(選択中)`;
    }
    return txt;
  };

  // LeafletのRectangle用に座標をLatLngBoundsに変換
  const rectBounds = (x,y,w,h) => {
    const southWest = [y+h, x];
    const northEast = [y, x+w];
    return [southWest, northEast];
  };

  return (
    <MapContainer
      center={[MAP_HEIGHT/2, MAP_WIDTH/2]}
      zoom={1}
      crs={L.CRS.Simple}
      // 幅はApp側で95%に、ここではwidth:100%
      style={{ width:'100%', height:'600px', border:'1px solid #ccc', borderRadius:'4px', background:'#fff' }}
      minZoom={-1}
      maxZoom={4}
    >
      <DisableMapInteractions disabled={seatRegistrationMode || infoOverlayRegistrationMode} />

      <MapEventHandler
        seatRegistrationMode={seatRegistrationMode}
        selectedSeatForRegistration={selectedSeatForRegistration}
        infoOverlayRegistrationMode={infoOverlayRegistrationMode}
        dragging={dragging}
        setDragging={setDragging}
        setDragStart={setDragStart}
        setTempRect={setTempRect}
        tempRect={tempRect}
        dragStart={dragStart}
        onSeatAreaSelected={onSeatAreaSelected}
        onInfoOverlayAreaSelected={onInfoOverlayAreaSelected}
      />

      <ImageOverlay
        url={BACKGROUND_IMAGE_URL}
        bounds={bounds}
      />

      {infoOverlays.map(info => (
        <Rectangle
          key={`info-${info.id}`}
          bounds={rectBounds(info.x, info.y, info.width, info.height)}
          pathOptions={{color:'#aaa', fillColor:'rgba(255,255,0,0.3)', fillOpacity:0.3}}
        >
          <Tooltip direction="center" permanent>{info.name}</Tooltip>
        </Rectangle>
      ))}

      {pendingInfoOverlays.map(o => (
        <Rectangle
          key={`pending-info-${o.tempId}`}
          bounds={rectBounds(o.x,o.y,o.width,o.height)}
          pathOptions={{color:'#aaa', fillColor:'rgba(0,255,255,0.3)', fillOpacity:0.3}}
        >
          <Tooltip direction="center" permanent>
            {o.name ? `${o.name}\n(未確定)` : `(未確定)`}
          </Tooltip>
        </Rectangle>
      ))}

      {allSeats.map(seat => {
        const disp = getSeatDisplayInfo(seat);
        if(!disp) return null;
        const color = seatFillColor(seat, disp);
        const text = seatDisplayText(seat, disp);

        return (
          <Rectangle
            key={`seat-${seat.id}`}
            bounds={rectBounds(disp.x, disp.y, disp.width, disp.height)}
            pathOptions={{color:'#000', fillColor:color, fillOpacity: color==='transparent'? 0:1}}
            eventHandlers={{
              click: () => handleSeatClick(seat)
            }}
          >
            <Tooltip direction="center" permanent>
              {text}
            </Tooltip>
          </Rectangle>
        );
      })}

      {tempRect && (
        // ドラッグ中の仮選択範囲を青色破線で表示
        <Rectangle
          bounds={rectBounds(tempRect.x, tempRect.y, tempRect.width, tempRect.height)}
          pathOptions={{color:'blue', dashArray:'4,4', fill:false}}
        />
      )}
    </MapContainer>
  );
}
