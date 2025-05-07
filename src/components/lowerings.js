import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Row, Button, Col, Card, Form, FormControl, Table, OverlayTrigger, Tooltip } from 'react-bootstrap'
import moment from 'moment'
import PropTypes from 'prop-types'
import LoweringForm from './lowering_form'
import DeleteModal from './delete_modal'
import DeleteFileModal from './delete_file_modal'
import ExecuteModal from './execute_modal'
import ImportFromFileModal from './import_from_file_modal'
import CopyLoweringToClipboard from './copy_lowering_to_clipboard'
import LoweringPermissionsModal from './lowering_permissions_modal'
import LoweringStatsModal from './lowering_stats_modal'
import CustomPagination from './custom_pagination'
import { USE_ACCESS_CONTROL } from '../client_settings'
import { _Lowerings_, _Lowering_, _lowering_ } from '../vocab'
import { create_lowering, get_cruises, get_lowerings_by_cruise } from '../api'
import * as mapDispatchToProps from '../actions'

let fileDownload = require('js-file-download')

const maxLoweringsPerPage = 6

const tableHeaderStyle = { width: USE_ACCESS_CONTROL ? '90px' : '70px' }

class Lowerings extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      lowerings: [],
      filteredLowerings: [],
      previouslySelectedLowering: null
    }

    this.fetchLowerings = this.fetchLowerings.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleLoweringImportClose = this.handleLoweringImportClose.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
  }

  componentDidMount() {
    this.setState({ previouslySelectedLowering: this.props.lowering_id })
    this.props.clearSelectedLowering()
    this.props.fetchLowerings()
  }

  async componentDidUpdate(prevProps) {
    if (this.props.lowerings !== prevProps.lowerings) {
      this.fetchLowerings()
    }

    if (this.props.roles !== prevProps.roles) {
      this.props.fetchLowerings()
    }
  }

  componentWillUnmount() {
    this.props.clearSelectedLowering()
    if (this.state.previouslySelectedLowering) {
      this.props.initLowering(this.state.previouslySelectedLowering)
    }
  }

  async fetchLowerings() {
    if (this.props.roles.includes('admin')) {
      this.setState({
        lowerings: this.props.lowerings,
        filteredLowerings: this.props.lowerings
      })
    } else {
      const now = moment.utc()
      const cruises = await get_cruises({ startTS: now.toISOString(), stopTS: now.toISOString() })
      if (!cruises.length) {
        this.setState({ lowerings: [] })
      } else {
        const lowerings = await get_lowerings_by_cruise(cruises[0].id)
        this.setState({
          lowerings,
          filteredLowerings: lowerings
        })
      }
    }
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  handleLoweringDeleteModal(id) {
    this.props.showModal('deleteModal', {
      id: id,
      handleDelete: this.props.deleteLowering,
      message: 'this lowering'
    })
  }

  handleLoweringExportModal(lowering) {
    this.props.showModal('executeCommand', {
      title: `Export ${_Lowering_}: ${lowering['lowering_id']}`,
      message: `Export data related to this ${_lowering_} to files.`,
      handleConfirm: () => this.props.exportLowering(lowering['id'])
    })
  }

  handleLoweringPermissionsModal(lowering) {
    this.props.showModal('loweringPermissions', { lowering_id: lowering.id })
  }

  handleLoweringUpdate(id) {
    this.props.initLowering(id)
    window.scrollTo(0, 0)
  }

  handleLoweringShow(id) {
    this.props.showLowering(id)
  }

  handleLoweringHide(id) {
    this.props.hideLowering(id)
  }

  handleLoweringCreate() {
    this.props.leaveLoweringForm()
  }

  handleLoweringImportModal() {
    this.props.showModal('importFromFileModal')
  }

  handleLoweringImportClose() {
    this.props.fetchLowerings()
  }

  handleSearchChange(event) {
    let fieldVal = event.target.value
    if (fieldVal !== '') {
      this.setState({
        filteredLowerings: this.state.lowerings.filter((lowering) => {
          const regex = RegExp(fieldVal, 'i')
          if (lowering.lowering_id.match(regex) || lowering.lowering_location.match(regex) || lowering.lowering_tags.includes(fieldVal)) {
            return lowering
          }
        })
      })
    } else {
      this.setState({ filteredLowerings: this.state.lowerings })
    }
    this.handlePageSelect(1)
  }

  exportLoweringsToJSON() {
    if (this.state.filteredLowerings.length) {
      fileDownload(JSON.stringify(this.state.filteredLowerings, null, '\t'), 'sealog_loweringsExport.json')
    }
  }

  async _insertLowering({
    id,
    lowering_id,
    start_ts,
    stop_ts,
    lowering_location = '',
    lowering_tags = [],
    lowering_hidden = false,
    lowering_additional_meta = {}
  }) {
    let result = {
      skipped: false,
      imported: false,
      error: null
    }
    // const item = await get_lowerings({}, id)

    // if (item) {
    //   this.setState((prevState) => ({
    //     skipped: prevState.skipped + 1,
    //     pending: prevState.pending - 1
    //   }))
    //   return
    // }

    const response = await create_lowering({
      id,
      lowering_id,
      start_ts,
      stop_ts,
      lowering_location,
      lowering_tags,
      lowering_hidden,
      lowering_additional_meta
    })

    if (response.success) {
      result.imported = true
      return result
    }

    if (response.error.response.data.statusCode == 400 && response.error.response.data.message == 'duplicate event ID') {
      result.skipped = true
      return result
    }

    result.error = { ...response.error.response.data, id: id || 'unknown' }
    return result
  }

  renderAddLoweringButton() {
    if (!this.props.showform && this.props.roles && this.props.roles.includes('admin')) {
      return (
        <Button variant='outline-primary' size='sm' onClick={() => this.handleLoweringCreate()} disabled={!this.props.lowering_id}>
          Add {_Lowering_}
        </Button>
      )
    }
  }

  renderImportLoweringsButton() {
    if (this.props.roles.includes('admin')) {
      return (
        <Button className='me-1' variant='outline-primary' size='sm' onClick={() => this.handleLoweringImportModal()}>
          Import From File
        </Button>
      )
    }
  }

  renderLowerings() {
    if (!this.state.filteredLowerings.length) {
      return (
        <tr key='noLowerings'>
          <td colSpan='3'> No lowerings found!</td>
        </tr>
      )
    }

    const editTooltip = <Tooltip id='editTooltip'>Edit this {_lowering_}.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this {_lowering_}.</Tooltip>
    const exportTooltip = <Tooltip id='exportTooltip'>Export this {_lowering_}.</Tooltip>
    const showTooltip = <Tooltip id='showTooltip'>{_Lowering_} is hidden, click to show.</Tooltip>
    const hideTooltip = <Tooltip id='hideTooltip'>{_Lowering_} is visible, click to hide.</Tooltip>
    const permissionTooltip = <Tooltip id='permissionTooltip'>User permissions.</Tooltip>

    return this.state.filteredLowerings.map((lowering, index) => {
      if (index >= (this.state.activePage - 1) * maxLoweringsPerPage && index < this.state.activePage * maxLoweringsPerPage) {
        let editLink = (
          <OverlayTrigger placement='top' overlay={editTooltip}>
            <FontAwesomeIcon className='text-warning' onClick={() => this.handleLoweringUpdate(lowering.id)} icon='pencil-alt' fixedWidth />
          </OverlayTrigger>
        )

        let permLink =
          USE_ACCESS_CONTROL && this.props.roles.includes('admin') ? (
            <OverlayTrigger placement='top' overlay={permissionTooltip}>
              <FontAwesomeIcon
                className='text-primary'
                onClick={() => this.handleLoweringPermissionsModal(lowering)}
                icon='user-lock'
                fixedWidth
              />
            </OverlayTrigger>
          ) : null

        let deleteLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={deleteTooltip}>
            <FontAwesomeIcon className='text-danger' onClick={() => this.handleLoweringDeleteModal(lowering.id)} icon='trash' fixedWidth />
          </OverlayTrigger>
        ) : null

        let exportLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={exportTooltip}>
            <FontAwesomeIcon className='text-info' onClick={() => this.handleLoweringExportModal(lowering)} icon='download' fixedWidth />
          </OverlayTrigger>
        ) : null

        let hiddenLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={lowering.lowering_hidden ? showTooltip : hideTooltip}>
            <FontAwesomeIcon
              className={lowering.lowering_hidden ? 'ps-1' : 'text-success ps-1'}
              onClick={() => (lowering.lowering_hidden ? this.handleLoweringShow(lowering.id) : this.handleLoweringHide(lowering.id))}
              icon={lowering.lowering_hidden ? 'eye-slash' : 'eye'}
              fixedWidth
            />
          </OverlayTrigger>
        ) : null

        let loweringLocation = lowering.lowering_location ? (
          <span>
            Location: {lowering.lowering_location}
            <br />
          </span>
        ) : null

        let loweringStartTime = moment.utc(lowering.start_ts)
        let loweringStopTime = moment.utc(lowering.stop_ts)
        let loweringDuration = loweringStopTime.diff(loweringStartTime)

        return (
          <tr key={lowering.id}>
            <td className={this.props.lowering_id === lowering.id ? 'text-warning' : ''}>{lowering.lowering_id}</td>
            <td className={this.props.lowering_id === lowering.id ? 'text-warning' : ''}>
              {loweringLocation}
              Started: {moment.utc(lowering.start_ts).format('YYYY-MM-DD HH:mm')}
              <br />
              Duration: {moment.duration(loweringDuration).format('d [days] h [hours] m [minutes]')}
              <br />
            </td>
            <td className='text-center'>
              {editLink}
              {permLink}
              {exportLink}
              {hiddenLink}
              {deleteLink}
              <CopyLoweringToClipboard lowering={lowering} />
            </td>
          </tr>
        )
      }
    })
  }

  renderLoweringTable() {
    return (
      <Table className='mb-0' bordered striped size='sm'>
        <thead>
          <tr>
            <th>{_Lowering_}</th>
            <th>Details</th>
            <th className='text-center' style={tableHeaderStyle}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{this.renderLowerings()}</tbody>
      </Table>
    )
  }

  renderLoweringHeader() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export {_Lowerings_}</Tooltip>

    return (
      <div>
        {_Lowerings_}
        <OverlayTrigger placement='top' overlay={exportTooltip}>
          <FontAwesomeIcon
            className='float-end pt-2 text-primary'
            onClick={() => this.exportLoweringsToJSON()}
            icon='download'
            fixedWidth
          />
        </OverlayTrigger>
        <Form className='float-end me-2'>
          <FormControl size='sm' type='text' placeholder='Search' onChange={this.handleSearchChange} />
        </Form>
      </div>
    )
  }

  render() {
    if (!this.props.roles) {
      return <div>Loading...</div>
    }

    if (this.props.roles.some((item) => ['admin', 'cruise_manager'].includes(item))) {
      return (
        <React.Fragment>
          <LoweringPermissionsModal onClose={this.props.fetchLowerings} />
          <LoweringStatsModal />
          <DeleteFileModal />
          <DeleteModal />
          <ExecuteModal />
          <ImportFromFileModal handleExit={this.handleLoweringImportClose} title='Import Lowerings' insertItem={this._insertLowering} />
          <Row className='d-flex justify-content-center py-2'>
            <Col className='px-1' sm={12} md={7} lg={6} xl={5}>
              <Card className='border-secondary'>
                <Card.Header>{this.renderLoweringHeader()}</Card.Header>
                {this.renderLoweringTable()}
              </Card>
              <CustomPagination
                className='mt-2'
                page={this.state.activePage}
                count={this.state.filteredLowerings.length}
                pageSelectFunc={this.handlePageSelect}
                maxPerPage={maxLoweringsPerPage}
              />
              <div className='my-2 float-end'>
                {this.renderImportLoweringsButton()}
                {this.renderAddLoweringButton()}
              </div>
            </Col>
            <Col className='px-1' sm={12} md={5} lg={6} xl={5}>
              <LoweringForm handleFormSubmit={this.props.fetchLowerings} />
            </Col>
          </Row>
        </React.Fragment>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

Lowerings.propTypes = {
  clearSelectedLowering: PropTypes.func.isRequired,
  lowering_id: PropTypes.string,
  lowerings: PropTypes.array,
  deleteLowering: PropTypes.func.isRequired,
  exportLowering: PropTypes.func.isRequired,
  fetchLowerings: PropTypes.func.isRequired,
  hideLowering: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  leaveLoweringForm: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showLowering: PropTypes.func.isRequired,
  showform: PropTypes.func,
  showModal: PropTypes.func.isRequired
}
const mapStateToProps = (state) => {
  return {
    lowerings: state.lowering.lowerings,
    lowering_id: state.lowering.lowering.id,
    roles: state.user.profile.roles || []
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Lowerings)
