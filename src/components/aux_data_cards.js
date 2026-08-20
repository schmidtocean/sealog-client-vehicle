import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Card, Col } from 'react-bootstrap'
import { formatAuxDataSourceName } from '../vocab'

const COORD_FORMATS = ['DD', 'DDM', 'DMS']

const isLatitude = (name) => /\blat(itude)?\b/i.test(name)
const isLongitude = (name) => /\blon(gitude)?\b|\blng\b/i.test(name)

const formatCoord = (value, lat, format) => {
  const num = parseFloat(value)
  if (isNaN(num)) return value

  const abs = Math.abs(num)
  const dir = lat ? (num >= 0 ? 'N' : 'S') : num >= 0 ? 'E' : 'W'
  const degrees = Math.floor(abs)
  const minutesDecimal = (abs - degrees) * 60

  if (format === 'DDM') {
    return `${degrees}° ${minutesDecimal.toFixed(4)}' ${dir}`
  }

  if (format === 'DMS') {
    const minutes = Math.floor(minutesDecimal)
    const seconds = (minutesDecimal - minutes) * 60
    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${dir}`
  }

  return value
}

class AuxDataCard extends Component {
  render() {
    const { coordFormat, onCoordClick } = this.props

    const aux_data_points = this.props.aux_data.data_array.map((data, index) => {
      const lat = isLatitude(data.data_name)
      const lon = isLongitude(data.data_name)
      const isCoord = lat || lon
      const converting = isCoord && coordFormat !== 'DD'

      const displayValue = converting ? formatCoord(data.data_value, lat, coordFormat) : data.data_value
      const displayUom = converting ? '' : data.data_uom

      return (
        <div key={`${this.props.aux_data.data_source}_data_point_${index}`}>
          <span className='data-name'>{data.data_name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>{' '}
          <span
            className={`float-end${isCoord ? ' clickable' : ''}`}
            style={{ wordWrap: 'break-word' }}
            onClick={isCoord ? onCoordClick : undefined}
            title={isCoord ? `Format: ${coordFormat} — click to change` : undefined}
          >
            {displayValue} {displayUom}
          </span>
          <br />
        </div>
      )
    })

    return (
      <Col
        className='event-data-col'
        key={`${this.props.aux_data.data_source}_col`}
        sm={this.props.sm || 6}
        md={this.props.md || 4}
        lg={this.props.lg || 3}
        xl={this.props.xl || 3}
      >
        <Card className='event-data-card' key={`${this.props.aux_data.data_source}`}>
          <Card.Header className='event-details'>{formatAuxDataSourceName(this.props.aux_data.data_source)}</Card.Header>
          <Card.Body>{aux_data_points}</Card.Body>
        </Card>
      </Col>
    )
  }
}

AuxDataCard.propTypes = {
  aux_data: PropTypes.object.isRequired,
  coordFormat: PropTypes.string.isRequired,
  onCoordClick: PropTypes.func.isRequired,
  sm: PropTypes.number,
  md: PropTypes.number,
  lg: PropTypes.number,
  xl: PropTypes.number
}

class AuxDataCards extends Component {
  constructor(props) {
    super(props)
    this.state = { coordFormat: localStorage.getItem('coordFormat') || 'DD' }
    this.cycleCoordFormat = this.cycleCoordFormat.bind(this)
  }

  cycleCoordFormat() {
    this.setState((prev) => {
      const idx = COORD_FORMATS.indexOf(prev.coordFormat)
      const coordFormat = COORD_FORMATS[(idx + 1) % COORD_FORMATS.length]
      localStorage.setItem('coordFormat', coordFormat)
      return { coordFormat }
    })
  }

  render() {
    return this.props.aux_data.map((aux_data) => {
      return (
        <AuxDataCard
          aux_data={aux_data}
          key={`${aux_data.data_source}_col`}
          coordFormat={this.state.coordFormat}
          onCoordClick={this.cycleCoordFormat}
          sm={this.props.sm}
          md={this.props.md}
          lg={this.props.lg}
          xl={this.props.xl}
        />
      )
    })
  }
}

AuxDataCards.propTypes = {
  aux_data: PropTypes.array.isRequired,
  sm: PropTypes.number,
  md: PropTypes.number,
  lg: PropTypes.number,
  xl: PropTypes.number
}

export default AuxDataCards
