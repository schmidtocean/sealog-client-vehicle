import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { getImageUrl, handleMissingImage } from '../utils'
import { Card, Col, Image } from 'react-bootstrap'

const getCameraStatusKey = (source) => {
  const normalized = `${source}`.toLowerCase()
  if (normalized.includes('scicam')) return 'scicam'
  if (normalized.includes('sitcam')) return 'sitcam'
  return null
}

class ImageryCard extends Component {
  constructor(props) {
    super(props)

    this.state = { validImage: true }
    this.handleMissingImage = this.handleMissingImage.bind(this)
    this.handleOnClick = this.handleOnClick.bind(this)
  }

  handleMissingImage(ev) {
    this.setState({ validImage: false })
    handleMissingImage(ev)
  }

  handleOnClick() {
    if (this.state.validImage) {
      this.props.onClick() || null
    }
  }

  render() {
    return (
      <Col
        className='px-1 pb-2'
        key={this.props.source}
        sm={this.props.sm || 6}
        md={this.props.md || 4}
        lg={this.props.lg || 3}
        xl={this.props.xl || 3}
      >
        <Card className='event-image-data-card' id={`image_${this.props.source}`}>
          <div className='event-image-16-9'>
            <Image onError={this.handleMissingImage} src={this.props.filepath} onClick={this.handleOnClick} />
          </div>
          <span className='d-flex justify-content-between ps-2 pe-2'>
            <span>{this.props.source}</span>
            {this.props.cameraStatus === 'true' && <span className='text-success'>REC</span>}
            {this.props.cameraStatus === 'false' && <span className='text-danger'>REC OFF</span>}
            {this.props.cameraStatus === 'unavailable' && <span className='text-danger'>STATUS N/A</span>}
          </span>
        </Card>
      </Col>
    )
  }
}

ImageryCard.propTypes = {
  source: PropTypes.string.isRequired,
  filepath: PropTypes.string.isRequired,
  cameraStatus: PropTypes.string,
  onClick: PropTypes.func,
  sm: PropTypes.number,
  md: PropTypes.number,
  lg: PropTypes.number,
  xl: PropTypes.number
}

class ImageryCards extends Component {
  render() {
    const cameraStatuses = this.props.cameraStatuses || {}
    let imageryCards = []
    this.props.image_data_sources.forEach((image_data_source) => {
      for (let j = 0; j < image_data_source.data_array.length; j += 2) {
        const source = image_data_source.data_array[j].data_value
        const filepath = image_data_source.data_array[j + 1].data_value
        const statusKey = getCameraStatusKey(source)
        imageryCards.push(
          <ImageryCard
            source={source}
            filepath={getImageUrl(filepath)}
            cameraStatus={statusKey ? cameraStatuses[statusKey] : undefined}
            onClick={() => this.props.onClick(source, filepath)}
            key={`${image_data_source.data_source}_${j}_col`}
            sm={this.props.sm}
            md={this.props.md}
            lg={this.props.lg}
            xl={this.props.xl}
          />
        )
      }
    })

    return imageryCards
  }
}

ImageryCards.propTypes = {
  image_data_sources: PropTypes.array.isRequired,
  cameraStatuses: PropTypes.object,
  onClick: PropTypes.func,
  sm: PropTypes.number,
  md: PropTypes.number,
  lg: PropTypes.number,
  xl: PropTypes.number
}

export default ImageryCards
