// SeatMap.js
import React, { useRef, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { BACKGROUND_IMAGE_URL } from '../config.js';
import { getReservationDetail } from '../services/api.js';

export default function SeatMap({ 
  selectedDate, 
  reservations, 
  selectedSeats, 
  onSelectedSeatsChange,
  seatRegistrationMode,
  selectedSeatForRegistration,
  onSeatAreaSelected,
  allSeats,
  onCancelReservation,
  pendingAssignments,
  infoOverlays,
  infoOverlayRegistrationMode,
  onInfoOverlayAreaSelected,
  pendingInfoOverlays
}) {
  const [bgImage] = useImage(BACKGROUND_IMAGE_URL);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [tempRect, setTempRect] = useState(null);
  const [detailModalData, setDetailModalData] = useState(null);

  const stageRef = useRef(null);

  const handleSeatClick = async (seat) => {
    // seatRegistrationModeやinfoOverlayRegistrationModeがfalseのときのみ選択可
    if (seatRegistrationMode || infoOverlayRegistrationMode) return;

    const reserved = reservations.find(r => r.seatId === seat.id && r.date === selectedDate);
    if (reserved) {
      const detail = await getReservationDetail(seat.id, selectedDate);
      setDetailModalData({
        seatId: seat.id,
        seatName: seat.name,
        name: detail.name,
        department: detail.department
      });
    } else {
      let newSelected;
      if (selectedSeats.find(s => s.id === seat.id)) {
        newSelected = selectedSeats.filter(s => s.id !== seat.id);
      } else {
        newSelected = [...selectedSeats, seat];
      }
      onSelectedSeatsChange(newSelected);
    }
  };

  const handleCancelClick = async (seatId) => {
    await onCancelReservation(seatId);
    setDetailModalData(null);
  };

  const isReserved = (seat) => {
    return reservations.some(r => r.seatId === seat.id && r.date === selectedDate);
  };

  const getReservationForSeat = (seat) => {
    return reservations.find(r => r.seatId === seat.id && r.date === selectedDate);
  };

  const handleMouseDown = (e) => {
    // 座席登録モード or 情報領域登録モードでのみドラッグ可能
    if ((seatRegistrationMode && selectedSeatForRegistration) || infoOverlayRegistrationMode) {
      const pos = e.target.getStage().getPointerPosition();
      setDragStart(pos);
      setDragging(true);
    }
  };

  const handleMouseMove = (e) => {
    if (dragging && (seatRegistrationMode && selectedSeatForRegistration || infoOverlayRegistrationMode) && dragStart) {
      const pos = e.target.getStage().getPointerPosition();
      const newRect = {
        x: Math.min(dragStart.x, pos.x),
        y: Math.min(dragStart.y, pos.y),
        width: Math.abs(dragStart.x - pos.x),
        height: Math.abs(dragStart.y - pos.y)
      };
      setTempRect(newRect);
    }
  };

  const handleMouseUp = () => {
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
  };

  const getSeatDisplayInfo = (seat) => {
    const pendingRect = pendingAssignments[seat.id];
    if (pendingRect) {
      return { x: pendingRect.x, y: pendingRect.y, width: pendingRect.width, height: pendingRect.height, isPending: true };
    } else if (seat.x != null && seat.y != null && seat.width != null && seat.height != null) {
      return { x: seat.x, y: seat.y, width: seat.width, height: seat.height, isPending: false };
    }
    return null;
  };

  return (
    <div className="seat-map-container">
      <Stage
        width={800}
        height={600}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{border: '1px solid #ccc', background: '#fafafa'}}
      >
        <Layer>
          {bgImage && <KonvaImage image={bgImage} x={0} y={0} width={800} height={600} />}

          {/* 確定済み情報領域 */}
          {infoOverlays.map(info => (
            <React.Fragment key={info.id}>
              <Rect
                x={info.x}
                y={info.y}
                width={info.width}
                height={info.height}
                fill="rgba(255,255,0,0.3)"
                stroke="#aaa"
              />
              <KonvaText
                x={info.x}
                y={info.y + info.height / 2 - 10}
                text={info.name}
                fontSize={12}
                width={info.width}
                align="center"
              />
            </React.Fragment>
          ))}

          {/* 仮登録中の情報領域 */}
          {pendingInfoOverlays.map(o => (
            <React.Fragment key={o.tempId}>
              <Rect
                x={o.x}
                y={o.y}
                width={o.width}
                height={o.height}
                fill="rgba(0,255,255,0.3)"
                stroke="#aaa"
              />
              <KonvaText
                x={o.x}
                y={o.y + o.height / 2 - 10}
                text={o.name ? `${o.name}\n(未確定)` : `(未確定)`}
                fontSize={12}
                width={o.width}
                align="center"
              />
            </React.Fragment>
          ))}

          {/* 座席表示 */}
          {allSeats.map(seat => {
            const disp = getSeatDisplayInfo(seat);
            if (!disp) return null;

            const reserved = isReserved(seat);
            const reservation = getReservationForSeat(seat);
            const selected = selectedSeats.some(s => s.id === seat.id);

            let fillColor = 'transparent';
            if (reserved) fillColor = '#ff9999';
            else if (selected) fillColor = '#99ff99';

            let displayText = seat.name;
            if (reserved && reservation) {
              displayText = `${seat.name}\n${reservation.name}`;
            } else if (disp.isPending) {
              displayText = `${seat.name}\n(未確定)`;
            } else if (selected && !reserved) {
              displayText = `${seat.name}\n(選択中)`;
            }

            return (
              <React.Fragment key={seat.id}>
                <Rect
                  x={disp.x}
                  y={disp.y}
                  width={disp.width}
                  height={disp.height}
                  fill={fillColor}
                  stroke="#000"
                  strokeWidth={1}
                  onClick={() => handleSeatClick(seat)}
                />
                {displayText && (
                  <KonvaText
                    x={disp.x}
                    y={disp.y + (disp.height / 2) - 10}
                    text={displayText}
                    fontSize={12}
                    width={disp.width}
                    align="center"
                  />
                )}
              </React.Fragment>
            );
          })}

          {tempRect && (
            <Rect
              x={tempRect.x}
              y={tempRect.y}
              width={tempRect.width}
              height={tempRect.height}
              stroke="blue"
              dash={[4,4]}
            />
          )}
        </Layer>
      </Stage>

      {detailModalData && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>予約詳細</h3>
            <p>席名: {detailModalData.seatName}</p>
            <p>氏名: {detailModalData.name}</p>
            <p>部署: {detailModalData.department}</p>
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => setDetailModalData(null)}>閉じる</button>
              <button onClick={() => handleCancelClick(detailModalData.seatId)}>予約取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
