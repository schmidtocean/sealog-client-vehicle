import React, { Component } from 'react'
import { compose } from 'redux'
import { connectModal } from 'redux-modal'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Collapse, Form, ListGroup, Modal } from 'react-bootstrap'
import { get_cruises, get_lowerings_by_cruise, get_users, update_cruise_permissions, update_lowering_permissions } from '../api'

const updateType = {
  ADD: true,
  REMOVE: false
}

class RenderTableRow extends Component {
  constructor(props) {
    super(props)

    this.state = {
      open: false,
      cruise: {},
      lowerings: []
    }

    this.toggleRowCollapse = this.toggleRowCollapse.bind(this)
    this.fetchLowerings = this.fetchLowerings.bind(this)
    this.updateCruisePermissions = this.updateCruisePermissions.bind(this)
    this.updateLoweringPermissions = this.updateLoweringPermissions.bind(this)
  }

  componentDidMount() {
    this.fetchCruise()
    this.fetchLowerings()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.cruise_id !== this.props.cruise_id) {
      this.fetchCruise()
      this.fetchLowerings()
    }
  }

  async fetchCruise() {
    const cruise = await get_cruises({}, this.props.cruise_id)
    this.setState({ cruise })
  }

  async fetchLowerings() {
    const lowerings = await get_lowerings_by_cruise(this.props.cruise_id)
    this.setState({ lowerings })
  }

  toggleRowCollapse() {
    this.setState((prevState) => {
      return { open: !prevState.open }
    })
  }

  async updateCruisePermissions(cruise_id, type) {
    const payload = {}
    if (type === updateType.ADD) {
      payload.add = [this.props.user_id]

      this.state.lowerings.forEach(async (lowering) => {
        await update_lowering_permissions(payload, lowering.id)
      })
    } else if (type === updateType.REMOVE) {
      payload.remove = [this.props.user_id]
    }

    await update_cruise_permissions(payload, cruise_id)
    await this.fetchLowerings()
    await this.fetchCruise()
  }

  async updateLoweringPermissions(lowering_id, type) {
    const payload = {}
    if (type === updateType.ADD) {
      payload.add = [this.props.user_id]
    } else if (type === updateType.REMOVE) {
      payload.remove = [this.props.user_id]
    }

    await update_lowering_permissions(payload, lowering_id)
    await this.fetchLowerings()
  }

  render() {
    const { cruise_id, user_id } = this.props

    return this.state.cruise.id ? (
      <React.Fragment>
        <ListGroup.Item className='event-list-item d-flex justify-content-between'>
          <Form.Check
            type='switch'
            id={`cruise_${cruise_id}`}
            label={`${this.state.cruise.cruise_id}${this.state.cruise.cruise_additional_meta.cruise_name ? ': ' + this.state.cruise.cruise_additional_meta.cruise_name : ''}`}
            checked={this.state.cruise.cruise_access_list && this.state.cruise.cruise_access_list.includes(user_id)}
            onChange={(e) => {
              this.updateCruisePermissions(cruise_id, e.target.checked)
            }}
          />
          {this.state.lowerings.length ? (
            <FontAwesomeIcon
              className='text-primary float-right'
              icon={this.state.open ? 'chevron-up' : 'chevron-down'}
              fixedWidth
              onClick={this.toggleRowCollapse}
            />
          ) : null}
        </ListGroup.Item>
        {this.state.lowerings.length ? (
          <Collapse in={this.state.open}>
            <ListGroup>
              {this.state.lowerings.map((lowering) => {
                return (
                  <ListGroup.Item key={lowering.lowering_id} className='event-list-item ms-2'>
                    <Form.Check
                      type='switch'
                      id={`lowering_${lowering.id}`}
                      label={`${lowering.lowering_id}${lowering.lowering_additional_meta.lowering_name ? ': ' + lowering.lowering_additional_meta.lowering_name : ''}`}
                      checked={lowering.lowering_access_list && lowering.lowering_access_list.includes(user_id)}
                      onChange={(e) => {
                        this.updateLoweringPermissions(lowering.id, e.target.checked)
                      }}
                      disabled={!this.state.cruise.cruise_access_list.includes(user_id)}
                    />
                  </ListGroup.Item>
                )
              })}
            </ListGroup>
          </Collapse>
        ) : null}
      </React.Fragment>
    ) : null
  }
}

RenderTableRow.propTypes = {
  cruise_id: PropTypes.string.isRequired,
  // lowerings: PropTypes.array.isRequired,
  // updateLoweringPermissions: PropTypes.func,
  user_id: PropTypes.string
}

class UserPermissionsModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      cruises: [],
      user: {}
    }

    this.fetchCruises = this.fetchCruises.bind(this)
    this.fetchUser = this.fetchUser.bind(this)
    this.handleHide = this.handleHide.bind(this)
  }

  componentDidMount() {
    this.fetchCruises()
    this.fetchUser()
  }

  async fetchCruises() {
    const cruises = await get_cruises()
    this.setState({ cruises })
  }

  async fetchUser() {
    const user = await get_users({}, this.props.user_id)
    this.setState({ user })
  }

  handleHide() {
    this.props.onClose()
    this.props.handleHide()
  }

  render() {
    const { show, user_id } = this.props

    return this.state.user.username ? (
      <Modal size='md' show={show} onHide={this.handleHide}>
        <form>
          <Modal.Header className='bg-light' closeButton>
            <Modal.Title>
              Access permissions for{' '}
              <i>
                <b>{this.state.user.username}</b>
              </i>
            </Modal.Title>
          </Modal.Header>
          <ListGroup>
            {this.state.cruises.map((cruise) => {
              return <RenderTableRow key={cruise.id} cruise_id={cruise.id} user_id={user_id} />
            })}
          </ListGroup>
        </form>
      </Modal>
    ) : null
  }
}

UserPermissionsModal.propTypes = {
  user_id: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  handleHide: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired
}

export default compose(connectModal({ name: 'userPermissions' }))(UserPermissionsModal)
