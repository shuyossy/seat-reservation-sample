// MapView.js
import React, { useState, useEffect } from 'react';
import { MapContainer, ImageOverlay, Rectangle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MAP_WIDTH, MAP_HEIGHT, BACKGROUND_IMAGE_URL } from '../config.js';
import { getReservationDetail } from '../services/api.js';

const bounds = [[0,0], [MAP_HEIGHT, MAP_WIDTH]];

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
      if ((seatRegistrationMode && selectedSeatForRegistration) || infoOverlayRegistrationMode) {
        // 座席範囲・情報領域登録中のみドラッグ開始
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // CRS.Simpleでmap.latLngToLayerPointを用いて座標変換
        const latlng = map.containerPointToLatLng([x,y]);
        setDragging(true);
        setDragStart(latlng);
      }
    }

    function onMouseMove(e) {
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

  const isReserved = (seat) => reservations.some(r => r.seatId === seat.id && r.date === selectedDate);
  const getReservationForSeat = (seat) => reservations.find(r => r.seatId === seat.id && r.date === selectedDate);

  const handleSeatClick = async (seat) => {
    if (seatRegistrationMode || infoOverlayRegistrationMode) return; // 登録モード中はクリック無効

    const reserved = isReserved(seat);
    if (reserved) {
      const detail = await getReservationDetail(seat.id, selectedDate);
      onShowDetailModal({
        seatId: seat.id,
        seatName: seat.name,
        name: detail.name,
        department: detail.department
      });
    } else {
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
    const pendingRect = pendingAssignments[seat.id];
    if (pendingRect) {
      return { x: pendingRect.x, y: pendingRect.y, width: pendingRect.width, height: pendingRect.height, isPending: true };
    } else if (seat.x != null && seat.y != null && seat.width != null && seat.height != null) {
      return { x: seat.x, y: seat.y, width: seat.width, height: seat.height, isPending: false };
    }
    return null;
  };

  const seatFillColor = (seat, disp) => {
    const reserved = isReserved(seat);
    const selected = selectedSeats.some(s => s.id === seat.id);
    if (reserved) return '#ff9999';
    if (selected) return '#99ff99';
    return 'transparent';
  };

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
      style={{ width:'800px', height:'600px', border:'1px solid #ccc' }}
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
        <Rectangle
          bounds={rectBounds(tempRect.x, tempRect.y, tempRect.width, tempRect.height)}
          pathOptions={{color:'blue', dashArray:'4,4', fill:false}}
        />
      )}
    </MapContainer>
  );
}
