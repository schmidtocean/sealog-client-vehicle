import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { Image, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { ROOT_PATH } from '../client_settings'

class InstanceLink extends Component {
  constructor(props) {
    super(props)

    this.renderTooltip = this.renderTooltip.bind(this)
  }

  renderTooltip(props) {
    return (
      <Tooltip id={`${this.props.instance}_tooltip`} {...props}>
        {`Goto ${this.props.instance}`}
      </Tooltip>
    )
  }

  render() {
    const placementCN = this.props.placement == 'right' ? 'ms-0 me-3' : 'ms-3 me-0'
    const placementTT = this.props.placement == 'right' ? 'left' : 'right'

    let imageFN = `${ROOT_PATH}images/fkt.png`
    if (this.props.instance === 'sealog-emp') {
      imageFN = `${ROOT_PATH}images/emp.png`
    } else if (this.props.instance === 'sealog-Sub') {
      imageFN = `${ROOT_PATH}images/sub.png`
    }

    return (
      <OverlayTrigger placement={placementTT} instance={this.props.instance} delay={{ show: 250, hide: 400 }} overlay={this.renderTooltip}>
        <Link className={placementCN} to={{ pathname: `./${this.props.instance}` }}>
          <Image style={{ height: '30px' }} src={imageFN} />
        </Link>
      </OverlayTrigger>
    )
  }
}

InstanceLink.propTypes = {
  instance: PropTypes.string,
  placement: PropTypes.string
}

export default InstanceLink
