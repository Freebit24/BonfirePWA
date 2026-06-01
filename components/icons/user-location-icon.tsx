import { Icon } from 'leaflet';

export const userLocationIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzMzMyMzIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiMwMDdBRkYiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, 0],
  className: 'user-location-marker',
});
