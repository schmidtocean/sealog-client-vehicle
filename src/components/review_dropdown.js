import React, { Component } from 'react'
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import * as mapDispatchToProps from '../actions'

class ReviewDropdown extends Component {
  constructor(props) {
    super(props)

    this.state = {
      id: this.props.id ? this.props.id : 'dropdown-review'
    }
  }

  render() {
    const { loweringID } = this.props
    const reviewTooltip = <Tooltip id='reviewTooltip'>Review this cruise</Tooltip>
    const className = this.props.className ? 'p-0 ' + this.props.className : 'p-0'

    if (loweringID) {
      return (
        <Dropdown as={'span'} id={this.state.id}>
          <Dropdown.Toggle
            className={className}
            style={{ fontSize: '.95rem', textDecoration: 'none', position: 'relative', bottom: '2px' }}
            variant='link'
            disabled={this.props.disabled}
          >
            <OverlayTrigger placement='top' overlay={reviewTooltip}>
              <span>{this.props.activeMode || 'Review'}</span>
            </OverlayTrigger>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {this.props.activeMode !== 'Replay' ? (
              <React.Fragment>
                <Dropdown.Item key='replay' onClick={() => this.props.gotoReviewReplay(this.props.loweringID)}>
                  Replay View
                </Dropdown.Item>
                <Dropdown.Divider />
              </React.Fragment>
            ) : null}
            {this.props.activeMode !== 'Map' ? (
              <React.Fragment>
                <Dropdown.Item key='map' onClick={() => this.props.gotoReviewMap(this.props.loweringID)}>
                  Map View
                </Dropdown.Item>
                <Dropdown.Divider />
              </React.Fragment>
            ) : null}
            {this.props.activeMode !== 'Gallery' ? (
              <Dropdown.Item key='map' onClick={() => this.props.gotoReviewGallery(this.props.loweringID)}>
                Gallery View
              </Dropdown.Item>
            ) : null}
          </Dropdown.Menu>
        </Dropdown>
      )
    }
    return null
  }
}

ReviewDropdown.propTypes = {
  activeMode: PropTypes.string,
  className: PropTypes.string,
  loweringID: PropTypes.string,
  disabled: PropTypes.bool,
  gotoReviewGallery: PropTypes.func.isRequired,
  gotoReviewMap: PropTypes.func.isRequired,
  gotoReviewReplay: PropTypes.func.isRequired,
  id: PropTypes.string
}

export default connect(null, mapDispatchToProps)(ReviewDropdown)
