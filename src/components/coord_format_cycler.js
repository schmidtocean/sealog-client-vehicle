import React, { useState } from 'react';
import PropTypes from 'prop-types';

const parseCoordinate = (value, coordinate) => {
  if (typeof value === 'number') return { format: 'decimal', value };
  if (typeof value !== 'string') return { format: 'unknown', value: null };

  const cleanValue = value.replace(/\s/g, '').toUpperCase();
  const decimalMatch = cleanValue.match(/^(-?\d+(\.\d+)?)[°]?([NSEW])?$/);
  const dmsMatch = cleanValue.match(/^(-?\d+)[°](\d+)['](\d+(\.\d+)?)["]?([NSEW])?$/);
  const dmMatch = cleanValue.match(/^(-?\d+)[°](\d+(\.\d+)?)[']([NSEW])?$/);

  let decimal, direction, format;

  if (decimalMatch) {
    [, decimal, , direction] = decimalMatch;
    format = 'decimal';
  } else if (dmsMatch) {
    const [, degrees, minutes, seconds] = dmsMatch;
    decimal = parseInt(degrees, 10) + parseInt(minutes, 10) / 60 + parseFloat(seconds) / 3600;
    direction = dmsMatch[5];
    format = 'dms';
  } else if (dmMatch) {
    const [, degrees, minutes] = dmMatch;
    decimal = parseInt(degrees, 10) + parseFloat(minutes) / 60;
    direction = dmMatch[4];
    format = 'dm';
  } else {
    return { format: 'unknown', value: null };
  }

  decimal = parseFloat(decimal);
  if (direction === 'S' || direction === 'W' || value.startsWith('-')) decimal = -Math.abs(decimal);

  if ((coordinate === 'latitude' && (decimal < -90 || decimal > 90)) ||
      (coordinate === 'longitude' && (decimal < -180 || decimal > 180))) {
    return { format: 'unknown', value: null };
  }

  return { format, value: decimal };
};

const formatCoordinate = (parsedValue, currentFormat, originalValue, coordinate) => {
  if (currentFormat === 'original' || parsedValue === null) return originalValue;

  const decimal = parsedValue;
  const absDec = Math.abs(decimal);
  const direction = coordinate === 'latitude' ? (decimal < 0 ? 'S' : 'N') : (decimal < 0 ? 'W' : 'E');

  switch (currentFormat) {
    case 'decimal':
      return `${decimal.toFixed(6)}°`;
    case 'dms': {
      const degrees = Math.floor(absDec);
      const minutes = Math.floor((absDec - degrees) * 60);
      const seconds = ((absDec - degrees) * 60 - minutes) * 60;
      return `${degrees}° ${minutes}' ${seconds.toFixed(4)}" ${direction}`;
    }
    case 'dm': {
      const degrees = Math.floor(absDec);
      const minutes = (absDec - degrees) * 60;
      return `${degrees}° ${minutes.toFixed(5)}' ${direction}`;
    }
    default:
      return originalValue;
  }
};

function CoordinateFormatCycler({ coordinate, name, value, uom }) {
  const [formatIndex, setFormatIndex] = useState(0);

  const { format, value: parsedValue } = parseCoordinate(value, coordinate);
  const formats = ['original', 'decimal', 'dms', 'dm'].filter(f => f === 'original' || f !== format);
  const currentFormat = formats[formatIndex];

  const cycleFormat = () => setFormatIndex((current) => (current + 1) % formats.length);
  const displayValue = formatCoordinate(parsedValue, currentFormat, value, coordinate);

  return (
    <div onClick={cycleFormat} className="coordinate-display" style={{ cursor: 'pointer' }}>
      <span className="data-name">{name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
      <span className="float-right">
        {displayValue}
        {(currentFormat === 'original' || currentFormat === 'decimal') ? ` ${uom}` : ''}
      </span>
    </div>
  );
};

CoordinateFormatCycler.propTypes = {
  coordinate: PropTypes.oneOf(['latitude', 'longitude']).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  uom: PropTypes.string.isRequired,
};

export default CoordinateFormatCycler;
