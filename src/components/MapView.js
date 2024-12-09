// components/MapView.js
// マップ表示用コンポーネント。

import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Rectangle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MAP_WIDTH, MAP_HEIGHT, BACKGROUND_IMAGE_URL } from '../config.js';
import { getReservationDetail } from '../services/api.js';

const bounds = [[0,0],[MAP_HEIGHT,MAP_WIDTH]]; 

// DisableMapInteractionsは登録モード中マップ操作を無効化、通常時は有効化するコンポーネント
function DisableMapInteractions({ disabled }) {
  const map = useMap();
  useEffect(() => {
    if (disabled) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.keyboard.enable();
    }
  }, [disabled, map]);

  return null;
}

// MapEventHandlerは範囲登録のドラッグ操作を管理します。
// マウスダウンでドラッグ開始、マウス移動で範囲更新、マウスアップで範囲確定します。
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
      // 座席範囲または情報領域登録中のみドラッグ可能
      if ((seatRegistrationMode && selectedSeatForRegistration) || infoOverlayRegistrationMode) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const latlng = map.containerPointToLatLng([x,y]);
        setDragging(true);
        setDragStart(latlng);
      }
    }

    function onMouseMove(e) {
      // ドラッグ中マウス移動時に範囲更新
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
      // ドラッグ終了で範囲確定
      if (dragging && tempRect) {
        if (seatRegistrationMode && selectedSeatForRegistration) {
          onSeatAreaSelected(selectedSeatForRegistration, tempRect);
        } else if (infoOverlayRegistrationMode) {
          onInfoOverlayAreaSelected(tempRect);
        }
      }
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
  // 2点(p1, p2)から(x,y,width,height)を求める関数です。
  // p1, p2はCRS.Simple下のlatlng、lat=y軸, lng=x軸と考えられます。
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
  onShowDetailModal,
  onInfoOverlayClick
}) {
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [tempRect, setTempRect] = useState(null);

  // 座席が指定日付で予約済みかを判定するヘルパー関数
  const isReserved = (seat) => reservations.some(r => r.seatId === seat.id && r.date === selectedDate);
  
  // 特定席の予約詳細を取得するヘルパー関数
  const getReservationForSeat = (seat) => reservations.find(r => r.seatId === seat.id && r.date === selectedDate);

  const handleSeatClick = async (seat) => {
    // 座席登録モードや情報領域登録モード中は座席クリック無効化
    if (seatRegistrationMode || infoOverlayRegistrationMode) return;

    const reserved = isReserved(seat);
    if (reserved) {
      // 予約済みの場合、詳細表示
      const detail = await getReservationDetail(seat.id, selectedDate);
      onShowDetailModal({
        seatId: seat.id,
        seatName: seat.name,    // 座席名は不要だがdetail内で参照する場合あり、不要なら使用しなくてもOK
        name: detail.name,
        department: detail.department
      });
    } else {
      // 未予約席は選択/解除
      let newSelected;
      if (selectedSeats.find(s => s.id === seat.id)) {
        newSelected = selectedSeats.filter(ss => ss.id !== seat.id);
      } else {
        newSelected = [...selectedSeats, seat];
      }
      onSelectedSeatsChange(newSelected);
    }
  };

  const getSeatDisplayInfo = (seat) => {
    // 座席の描画範囲を決定する関数
    // pendingAssignmentsが存在すれば、そこから即座に更新後の範囲を取得可能
    const pendingRect = pendingAssignments[seat.id];
    if (pendingRect) {
      return { x: pendingRect.x, y: pendingRect.y, width: pendingRect.width, height: pendingRect.height, isPending: true };
    } else if (seat.x != null && seat.y != null && seat.width != null && seat.height != null) {
      return { x: seat.x, y: seat.y, width: seat.width, height: seat.height, isPending: false };
    }
    return null;
  };

  const seatFillColor = (seat, disp) => {
    // 座席の背景色を決める関数
    // 予約済みは赤系、選択中は緑系、どれでもなければ透明
    const reserved = isReserved(seat);
    const selected = selectedSeats.some(s => s.id === seat.id);
    if (reserved) return '#ff9999';
    if (selected) return '#99ff99';
    return 'transparent';
  };

  const rectBounds = (x,y,w,h) => {
    // (x,y,width,height)からLeaflet用のLatLngBoundsを生成する関数
    const southWest = [y+h, x];
    const northEast = [y, x+w];
    return [southWest, northEast];
  };

  const handleInfoOverlayClickInternal = (overlay) => {
    // 地割登録モード中に既存情報領域クリックで削除確認を行うためのコールバック呼び出し
    if (infoOverlayRegistrationMode) {
      onInfoOverlayClick(overlay);
    }
  };

  // ホバー時に予約者名と部署、または"未予約"を表示するための関数
  // reservedがtrueなら予約詳細を、falseなら"未予約"を返す
  const getSeatTooltipContent = (seat) => {
    const reserved = isReserved(seat);
    if (reserved) {
      const r = getReservationForSeat(seat);
      // 予約者名と部署を表示
      return `${r.name}\n${r.department}`;
    } else {
      // 未予約の場合"未予約"と表示
      return "未予約";
    }
  };

  return (
    <MapContainer
      center={[MAP_HEIGHT/2, MAP_WIDTH/2]}
      zoom={1}
      crs={L.CRS.Simple}
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
          // infoOverlayRegistrationModeが変更されるたびに再レンダリングされるように促す
          key={`info-${info.id}-${infoOverlayRegistrationMode}`}
          bounds={rectBounds(info.x, info.y, info.width, info.height)}
          pathOptions={{color:'#aaa', fillColor:'rgba(255,255,0,0.3)', fillOpacity:0.3}}
          interactive={infoOverlayRegistrationMode}
          eventHandlers={{
            click: () => handleInfoOverlayClickInternal(info)
          }}
        >
          <Tooltip direction="center" permanent>
            {/* 情報領域には特に予約情報はなく、名称を表示してもよいが要望なし。
               情報領域クリックは削除確認用なので、名称表示はこのまま残す。 */}
            {info.name}
          </Tooltip>
        </Rectangle>
      ))}

      {pendingInfoOverlays.map(o => (
        <Rectangle
          key={`pending-info-${o.tempId}`}
          bounds={rectBounds(o.x,o.y,o.width,o.height)}
          pathOptions={{color:'#aaa', fillColor:'rgba(0,255,255,0.3)', fillOpacity:0.3}}
        >
          <Tooltip direction="center" permanent>
            {/* 仮登録中の情報領域は名称未確定なら"(未確定)"とでも表示可能。
               ここでは名称未入力なら"(未確定)"とする。 */}
            {o.name ? `${o.name}\n(未確定)` : `(未確定)`}
          </Tooltip>
        </Rectangle>
      ))}

      {allSeats.map(seat => {
        const disp = getSeatDisplayInfo(seat);
        if(!disp) return null; 
        // 座標未設定の場合は表示なし

        const color = seatFillColor(seat, disp);
        const tooltipContent = getSeatTooltipContent(seat);
        const rectPathOption = seatRegistrationMode
            ? { color: 'blue', dashArray: '4,4', fill: false }
            : { color: 'transparent', fill: true, dashArray: null, fillColor: color, fillOpacity: color === 'transparent' ? 0.3 : 0.3 };

        return (
          <Rectangle
            key={`seat-${seat.id}`}
            bounds={rectBounds(disp.x, disp.y, disp.width, disp.height)}
            pathOptions={rectPathOption}
            eventHandlers={{
              click: () => handleSeatClick(seat)
            }}
          >
            {/* ホバー時に予約者名・部署または"未予約"を表示するTooltip
               sticky属性を使い、マウスホバー時にツールチップ表示を維持します。 */}
            <Tooltip sticky>
              {tooltipContent}
            </Tooltip>
          </Rectangle>
        );
      })}

      {tempRect && (
        // ドラッグ中に選択中範囲を青破線で表示
        <Rectangle
          bounds={rectBounds(tempRect.x, tempRect.y, tempRect.width, tempRect.height)}
          pathOptions={{color:'blue', dashArray:'4,4', fill:false}}
        />
      )}
    </MapContainer>
  );
}
