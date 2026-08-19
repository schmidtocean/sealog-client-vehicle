import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { connectModal } from 'redux-modal'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Map, TileLayer, WMSTileLayer, Marker, Polyline, Popup, LayersControl, ScaleControl, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import Highcharts from 'highcharts'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsNoDataToDisplay from 'highcharts/modules/no-data-to-display'
import HighchartsReact from 'highcharts-react-official'
import moment from 'moment'
import { Button, Row, Col, Form, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { renderAlert, renderMessage } from './form_elements'
import { highchartsTheme } from '../utils'
import LoweringStatsForm from './lowering_stats_form'
import { DEFAULT_LOCATION, TILE_LAYERS } from '../map_tilelayers'
import { START_MILESTONE, STOP_MILESTONE } from '../milestones'
import { POSITION_DATASOURCES } from '../client_settings'
import { get_event_exports_by_lowering } from '../api'
import * as mapDispatchToProps from '../actions'

// Set custom theme
Highcharts.theme = highchartsTheme
Highcharts.setOptions(Highcharts.theme)

HighchartsExporting(Highcharts)
HighchartsNoDataToDisplay(Highcharts)

const { BaseLayer } = LayersControl

const MILESTONE_OPTION_NAME = 'milestone'
const LOWERING_START_MILESTONE = 'start_ts'
const LOWERING_STOP_MILESTONE = 'stop_ts'

// Older event templates used these fixed milestone names. When a currently
// configured event template supplies one of the listed replacement values,
// the legacy stored milestone is treated as superseded and hidden so it
// isn't shown twice.
const LEGACY_MILESTONE_REPLACEMENTS = {
  lowering_descending: ['Descent Initiated', 'Initial Descent'],
  lowering_on_bottom: ['Reached Survey Depth', 'At Depth'],
  lowering_off_bottom: ['Leaving Survey Depth'],
  lowering_on_surface: ['Vehicle on Surface']
}

class LoweringStatsModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      posDataSource: null,

      event: {},
      events: [],
      hideASNAP: true,

      fetching: false,
      tracklines: {},

      show_edit_form: false,

      zoom: 13,
      center: DEFAULT_LOCATION,
      position: DEFAULT_LOCATION,
      showMarker: false,
      height: '400px',

      milestone_to_edit: null,
      milestones: this.getInitialMilestones(props),
      stats: {
        max_depth:
          this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.max_depth
            ? this.props.lowering.lowering_additional_meta.stats.max_depth
            : null,
        bounding_box:
          this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.bounding_box
            ? this.props.lowering.lowering_additional_meta.stats.bounding_box
            : []
      },
      touched: false,

      depthChartOptions: {
        title: {
          text: null
        },
        chart: {
          height: 200,
          zoomType: 'x'
        },
        legend: {
          enabled: false
        },
        series: [
          {
            data: []
          }
        ],
        tooltip: {
          enabled: true,
          crosshairs: true,
          formatter: this.tooltipFormatter.bind(this)
        },
        xAxis: {
          type: 'datetime',
          minRange: 1,
          plotLines: []
        },
        yAxis: {
          title: {
            text: null
          },
          min: 0,
          reversed: true
        },
        plotOptions: {
          series: {
            animation: false,
            events: {
              mouseOut: this.clearEvent.bind(this)
            },
            point: {
              events: {
                click: this.handleClick.bind(this),
                mouseOver: this.setEventbyTS.bind(this)
              },
              marker: {
                lineWidth: 1
              }
            }
          }
        }
      }
    }

    this.handleMoveEnd = this.handleMoveEnd.bind(this)
    this.handleZoomEnd = this.handleZoomEnd.bind(this)
    this.initMapView = this.initMapView.bind(this)
    this.setEventbyTS = this.setEventbyTS.bind(this)
    this.clearEvent = this.clearEvent.bind(this)
    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleShowEditForm = this.handleShowEditForm.bind(this)
    this.toggleASNAP = this.toggleASNAP.bind(this)
  }

  componentDidMount() {
    this.props.fetchEventTemplates()
    this.initEvents(this.props.lowering.id)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.milestones !== prevState.milestones) {
      this.setPlotLines()
    }

    if (this.state.milestone_to_edit !== prevState.milestone_to_edit) {
      this.setPlotLines()
    }

    if (this.props.event_templates !== prevProps.event_templates && this.state.posDataSource) {
      this.setState((prevState) => {
        return {
          depthChartOptions: {
            ...prevState.depthChartOptions,
            series: this.getDepthChartSeries(prevState.posDataSource, prevState.tracklines, prevState.events, prevState.hideASNAP)
          }
        }
      })
    }
  }

  componentWillUnmount() {
    if (this.props.lowering) {
      this.props.initLowering(this.props.lowering.id)
    }
  }

  getSavedMilestones(props = this.props) {
    return props.lowering.lowering_additional_meta && props.lowering.lowering_additional_meta.milestones
      ? props.lowering.lowering_additional_meta.milestones
      : {}
  }

  getInitialMilestones(props = this.props) {
    return {
      [LOWERING_START_MILESTONE]: props.lowering.start_ts,
      ...this.getSavedMilestones(props),
      [LOWERING_STOP_MILESTONE]: props.lowering.stop_ts
    }
  }

  getMilestoneKey(template) {
    if (!template.event_options) {
      return null
    }

    const milestoneOption = template.event_options.find((option) => option.event_option_name === MILESTONE_OPTION_NAME)

    if (!milestoneOption) {
      return null
    }

    if (milestoneOption.event_option_default_value) {
      return milestoneOption.event_option_default_value
    }

    if (Array.isArray(milestoneOption.event_option_values) && milestoneOption.event_option_values.length === 1) {
      return milestoneOption.event_option_values[0]
    }

    return null
  }

  getMilestoneTemplates(props = this.props) {
    const event_templates = props.event_templates || []
    const seen = new Set()

    return event_templates.reduce((milestones, template) => {
      if (template.disabled) {
        return milestones
      }

      const key = this.getMilestoneKey(template)
      if (!key || seen.has(key)) {
        return milestones
      }

      seen.add(key)
      milestones.push({
        key,
        label: key
      })

      return milestones
    }, [])
  }

  formatMilestoneLabel(key) {
    return key
      .replace(/^lowering_/, '')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  getMilestoneLabel(key) {
    const milestone = this.getMilestoneItems().find((item) => item.key === key)
    return milestone ? milestone.label : this.formatMilestoneLabel(key)
  }

  hasReplacementMilestone(key, displayedKeys) {
    const replacementKeys = LEGACY_MILESTONE_REPLACEMENTS[key] || []

    return replacementKeys.some((replacementKey) => displayedKeys.has(replacementKey))
  }

  getMilestoneItems() {
    const items = [{ key: LOWERING_START_MILESTONE, label: START_MILESTONE.label }, ...this.getMilestoneTemplates()]
    const displayedKeys = new Set(items.map((item) => item.key))

    Object.keys(this.state.milestones).forEach((key) => {
      if (key !== LOWERING_START_MILESTONE && key !== LOWERING_STOP_MILESTONE && !displayedKeys.has(key)) {
        if (!this.hasReplacementMilestone(key, displayedKeys)) {
          items.push({ key, label: this.formatMilestoneLabel(key) })
        }
        displayedKeys.add(key)
      }
    })

    items.push({ key: LOWERING_STOP_MILESTONE, label: STOP_MILESTONE.label })

    return items
  }

  renderMilestoneItems() {
    return this.getMilestoneItems().map((milestone) => {
      return (
        <React.Fragment key={milestone.key}>
          <span
            className={this.state.milestone_to_edit == milestone.key ? 'text-warning' : ''}
            onClick={() => this.setMilestoneToEdit(milestone.key)}
          >
            {milestone.label}: {this.state.milestones[milestone.key]}
          </span>
          <br />
        </React.Fragment>
      )
    })
  }

  getDepthChartData(posDataSource, tracklines = this.state.tracklines, events = this.state.events, hideASNAP = this.state.hideASNAP) {
    if (!posDataSource || !tracklines[posDataSource]) {
      return []
    }

    if (!hideASNAP) {
      return tracklines[posDataSource].depth
    }

    const asnapTimestamps = new Set(events.filter((event) => event.event_value === 'ASNAP').map((event) => moment.utc(event.ts).valueOf()))
    return tracklines[posDataSource].depth.filter((depth) => !asnapTimestamps.has(depth[0]))
  }

  getEventMilestone(event) {
    return event.event_options ? event.event_options.find((option) => option.event_option_name === MILESTONE_OPTION_NAME) : null
  }

  getNearestDepth(depthData, targetTS) {
    if (!depthData || depthData.length === 0) {
      return null
    }

    return depthData.reduce((nearestDepth, depth) => {
      return Math.abs(depth[0] - targetTS) < Math.abs(nearestDepth[0] - targetTS) ? depth : nearestDepth
    }, depthData[0])
  }

  getMilestoneChartData(posDataSource, tracklines = this.state.tracklines, events = this.state.events) {
    if (!posDataSource || !tracklines[posDataSource]) {
      return []
    }

    const milestoneValues = new Set(this.getMilestoneItems().map((milestone) => milestone.key))

    return events.reduce((milestoneData, event) => {
      const milestone = this.getEventMilestone(event)

      if (!milestone || !milestoneValues.has(milestone.event_option_value)) {
        return milestoneData
      }

      const eventTS = moment.utc(event.ts).valueOf()
      const depth = this.getNearestDepth(tracklines[posDataSource].depth, eventTS)

      if (depth) {
        milestoneData.push({
          x: eventTS,
          y: depth[1],
          marker: {
            enabled: true,
            fillColor: '#77B300',
            lineColor: '#FFFFFF',
            lineWidth: 1,
            radius: 6,
            symbol: 'circle'
          }
        })
      }

      return milestoneData
    }, [])
  }

  getDepthChartSeries(posDataSource, tracklines = this.state.tracklines, events = this.state.events, hideASNAP = this.state.hideASNAP) {
    return [
      {
        data: this.getDepthChartData(posDataSource, tracklines, events, hideASNAP)
      },
      {
        type: 'scatter',
        data: this.getMilestoneChartData(posDataSource, tracklines, events),
        zIndex: 5
      }
    ]
  }

  async initEvents() {
    const events = await get_event_exports_by_lowering({}, this.props.lowering.id)
    this.setState({ events })
    this.initLoweringTrackline()
    this.setPlotLines()
  }

  async initLoweringTrackline() {
    this.setState({ fetching: true })

    let tracklines = {}

    for (const datasource of POSITION_DATASOURCES) {
      let trackline = {
        ts: [],
        depth: [],
        polyline: L.polyline([]),
        startPoint: null,
        endPoint: null
      }

      if (!this.state.events.length) {
        continue
      }

      this.state.events.forEach((event) => {
        const aux_data =
          (event['aux_data'] && event['aux_data'].find((aux_data_source) => aux_data_source['data_source'] === datasource)) || {}

        if (!aux_data.data_array) {
          return
        }

        try {
          const rawLat = aux_data['data_array'].find((data) => data['data_name'] === 'latitude')
          const rawLng = aux_data['data_array'].find((data) => data['data_name'] === 'longitude')
          const rawDepth = aux_data['data_array'].find((data) => data['data_name'] === 'depth')

          if (rawLat && rawLng) {
            const latLng = [parseFloat(rawLat['data_value']), parseFloat(rawLng['data_value'])]
            if (latLng[0] != 0 && latLng[1] != 0) {
              trackline.polyline.addLatLng(latLng)
              if (trackline.startPoint === null) {
                trackline.startPoint = latLng
              }
              trackline.endPoint = latLng
            }
          }

          if (rawDepth && event['ts']) {
            const eventTS = moment.utc(event['ts']).valueOf()
            const depth = parseFloat(rawDepth['data_value'])

            if (Number.isFinite(eventTS) && Number.isFinite(depth)) {
              trackline.ts.push(eventTS)
              trackline.depth.push([eventTS, depth])
            }
          }
        } catch {
          console.error('Problem parsing', aux_data['data_array'])
        }
      })

      if (trackline.ts.length) {
        tracklines[datasource] = trackline

        const posDataSource = datasource

        this.setState(
          (prevState) => {
            return {
              tracklines,
              posDataSource,
              depthChartOptions: {
                ...prevState.depthChartOptions,
                series: this.getDepthChartSeries(posDataSource, tracklines, this.state.events, prevState.hideASNAP)
              }
            }
          },
          () => {
            this.handleCalculateMaxDepth()
            this.handleCalculateBoundingBox()
          }
        )
        break
      }
    }

    this.setState({ fetching: false })
    this.initMapView()
  }

  initMapView() {
    if (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      this.map.leafletElement.panTo(this.state.tracklines[this.state.posDataSource].polyline.getBounds().getCenter())
      this.map.leafletElement.fitBounds(this.state.tracklines[this.state.posDataSource].polyline.getBounds())
    }
  }

  handleShowEditForm() {
    this.setState((prevState) => {
      return { show_edit_form: !prevState.show_edit_form }
    })
  }

  toggleASNAP() {
    this.setState((prevState) => {
      const hideASNAP = !prevState.hideASNAP

      return {
        event: null,
        hideASNAP,
        depthChartOptions: {
          ...prevState.depthChartOptions,
          series: this.getDepthChartSeries(prevState.posDataSource, prevState.tracklines, prevState.events, hideASNAP)
        }
      }
    })
  }

  handleFormSubmit(formProps) {
    this.setState({
      milestones: {
        ...formProps.lowering_additional_meta.milestones,
        [LOWERING_START_MILESTONE]: formProps.start_ts,
        [LOWERING_STOP_MILESTONE]: formProps.stop_ts
      },
      stats: formProps.lowering_additional_meta.stats,
      touched: false,
      show_edit_form: false
    })

    this.props.updateLowering(formProps)
  }

  handleCalculateBoundingBox() {
    if (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      let lowering_bounds = this.state.tracklines[this.state.posDataSource].polyline.getBounds()
      this.setState((prevState) => {
        return {
          touched: true,
          stats: {
            ...prevState.stats,
            bounding_box: [lowering_bounds.getNorth(), lowering_bounds.getEast(), lowering_bounds.getSouth(), lowering_bounds.getWest()]
          }
        }
      })
    }
  }

  handleCalculateMaxDepth() {
    if (this.state.tracklines[this.state.posDataSource] && this.state.tracklines[this.state.posDataSource].depth.length > 0) {
      let maxDepth = this.state.tracklines[this.state.posDataSource].depth.reduce((current_max_depth, depth) => {
        current_max_depth = depth[1] > current_max_depth ? depth[1] : current_max_depth
        return current_max_depth
      }, 0)

      this.setState((prevState) => {
        return { touched: true, stats: { ...prevState.stats, max_depth: maxDepth } }
      })
    }
  }

  handleClick() {
    if (this.state.milestone_to_edit && this.state.event && this.state.event.ts) {
      this.setState((prevState) => {
        return { touched: true, milestones: { ...prevState.milestones, [prevState.milestone_to_edit]: prevState.event.ts } }
      })
      this.setMilestoneToEdit()
    }
  }

  handleUpdateLowering() {
    const newMilestones = { ...this.state.milestones }
    delete newMilestones[LOWERING_START_MILESTONE]
    delete newMilestones[LOWERING_STOP_MILESTONE]

    let stats = { ...this.state.stats }

    if (this.state.tracklines[this.state.posDataSource] && this.state.tracklines[this.state.posDataSource].depth.length > 0) {
      stats.max_depth = this.state.tracklines[this.state.posDataSource].depth.reduce((current_max_depth, depth) => {
        current_max_depth = depth[1] > current_max_depth ? depth[1] : current_max_depth
        return current_max_depth
      }, 0)
    }

    if (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      let lowering_bounds = this.state.tracklines[this.state.posDataSource].polyline.getBounds()
      stats.bounding_box = [lowering_bounds.getNorth(), lowering_bounds.getEast(), lowering_bounds.getSouth(), lowering_bounds.getWest()]
    }

    const newLoweringAdditionalMeta = {
      ...this.props.lowering.lowering_additional_meta,
      milestones: newMilestones,
      stats
    }

    delete newLoweringAdditionalMeta['lowering_files']

    const newLoweringRecord = {
      ...this.props.lowering,
      start_ts: this.state.milestones[LOWERING_START_MILESTONE],
      stop_ts: this.state.milestones[LOWERING_STOP_MILESTONE],
      lowering_additional_meta: newLoweringAdditionalMeta
    }

    this.props.updateLowering(newLoweringRecord)
    this.setState({ stats, touched: false })
  }

  setMilestoneToEdit(milestone = null) {
    if (milestone !== null && milestone !== this.state.milestone_to_edit) {
      this.setState({ milestone_to_edit: milestone })
    } else {
      this.setState({ milestone_to_edit: null })
    }
  }

  setPlotLines() {
    let xAxis = this.state.depthChartOptions.xAxis
    xAxis.plotLines = []

    for (const [key, value] of Object.entries(this.state.milestones)) {
      if (value) {
        if (key === this.state.milestone_to_edit) {
          xAxis.plotLines.push({
            color: '#FF0000',
            width: 2,
            value: moment.utc(value).valueOf()
          })
        } else {
          xAxis.plotLines.push({
            color: '#CFCFCF',
            width: 2,
            value: moment.utc(value).valueOf()
          })
        }
      }
    }

    this.setState((prevState) => {
      return { depthChartOptions: { ...prevState.depthChartOptions, xAxis: xAxis } }
    })
  }

  clearEvent() {
    this.setState({ event: {} })
  }

  setEventbyTS(e) {
    let tsStr = moment.utc(e.target.x).toISOString()
    this.setState({ event: this.state.events.find((event) => event.ts === tsStr) })
  }

  tooltipFormatter() {
    if (!this.state.event) {
      return ''
    }

    let event_txt = `<b>EVENT: ${this.state.event.event_value}</b>`
    if (this.state.event.event_value === 'FREE_FORM') {
      event_txt = `<span>${event_txt}<br/><b>Text:</b> ${this.state.event.event_free_text}</span>`
    } else if (this.state.event.event_value === 'VEHICLE') {
      const milestone = this.state.event.event_options.find((option) => option['event_option_name'] === 'milestone')
      if (milestone) {
        event_txt = `<span>${event_txt}<br/><b>Milestone:</b> ${milestone['event_option_value']}</span>`
      }
    }

    return `${event_txt}<br/><span>${this.state.event.ts}</span><br/>
      ${this.state.milestone_to_edit ? '<span>Click to set ' + this.getMilestoneLabel(this.state.milestone_to_edit) + '.</span>' : ''}`
  }

  handleZoomEnd() {
    if (this.map) {
      this.setState({ zoom: this.map.leafletElement.getZoom() })
    }
  }

  handleMoveEnd() {
    if (this.map) {
      this.setState({ center: this.map.leafletElement.getCenter() })
    }
  }

  renderMarker() {
    if (this.state.event && this.state.event.aux_data) {
      const posData = this.state.event.aux_data.find((data) => data['data_source'] === this.state.posDataSource)
      if (!posData) {
        return null
      }

      const rawLat = posData['data_array'].find((data) => data['data_name'] == 'latitude')
      const rawLng = posData['data_array'].find((data) => data['data_name'] == 'longitude')
      if (rawLat && rawLng) {
        return (
          <Marker position={[parseFloat(rawLat['data_value']), parseFloat(rawLng['data_value'])]}>
            <Popup>You are here! :-)</Popup>
          </Marker>
        )
      }
    }
  }

  render() {
    const { show, handleHide } = this.props

    const baseLayers = TILE_LAYERS.map((layer, index) => {
      if (layer.wms) {
        return (
          <BaseLayer checked={layer.default} key={`baseLayer_${index}`} name={layer.name}>
            <WMSTileLayer attribution={layer.attribution} url={layer.url} layers={layer.layers} transparent={layer.transparent} />
          </BaseLayer>
        )
      } else {
        return (
          <BaseLayer checked={layer.default} key={`baseLayer_${index}`} name={layer.name}>
            <TileLayer
              attribution={layer.attribution}
              url={layer.url}
              tms={layer.tms ?? false}
              zoomOffset={layer.zoomOffset ?? 0}
              maxNativeZoom={layer.maxNativeZoom}
            />
          </BaseLayer>
        )
      }
    })

    const milestones_and_stats = this.state.show_edit_form ? (
      <Col md={12}>
        <LoweringStatsForm
          milestoneItems={this.getMilestoneItems()}
          milestones={this.state.milestones}
          stats={this.state.stats}
          handleHide={this.handleShowEditForm}
          handleFormSubmit={this.handleFormSubmit}
        />
      </Col>
    ) : (
      [
        <Col key='milestones' md={6}>
          <strong style={{ fontSize: 'large' }}>Milestones</strong>
          <div>{this.renderMilestoneItems()}</div>
        </Col>,
        <Col key='stats' md={6}>
          <strong style={{ fontSize: 'large' }}>Stats</strong>
          <div className='pl-3'>
            <strong>Max Depth:</strong> {this.state.stats.max_depth}{' '}
            <OverlayTrigger placement='top' overlay={<Tooltip id='maxDepthTooltip'>Click to calculate max depth from depth data.</Tooltip>}>
              <FontAwesomeIcon className='text-primary' onClick={() => this.handleCalculateMaxDepth()} icon='calculator' fixedWidth />
            </OverlayTrigger>
          </div>
          <div className='pl-3'>
            <strong>Bounding Box:</strong> {this.state.stats.bounding_box ? this.state.stats.bounding_box.join(', ') : ''}{' '}
            <OverlayTrigger
              placement='top'
              overlay={<Tooltip id='boundingBoxTooltip'>Click to calculate the bounding box from position data.</Tooltip>}
            >
              <FontAwesomeIcon className='text-primary' onClick={() => this.handleCalculateBoundingBox()} icon='calculator' fixedWidth />
            </OverlayTrigger>
          </div>
        </Col>
      ]
    )
    const depth_profile = (
      <div>
        <Form.Check
          id='loweringStatsASNAP'
          type='switch'
          inline
          checked={!this.state.hideASNAP}
          onChange={() => this.toggleASNAP()}
          label='ASNAP'
        />
        <HighchartsReact highcharts={Highcharts} options={this.state.depthChartOptions} oneToOne={true} />
      </div>
    )

    const trackLine =
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty() ? (
        <Polyline color='yellow' positions={this.state.tracklines[this.state.posDataSource].polyline.getLatLngs()} />
      ) : null

    const startMarker =
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].startPoint !== null ? (
        <CircleMarker center={this.state.tracklines[this.state.posDataSource].startPoint} radius={3} color={'green'} />
      ) : null

    const endMarker =
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].endPoint !== null ? (
        <CircleMarker center={this.state.tracklines[this.state.posDataSource].endPoint} radius={3} color={'red'} />
      ) : null

    if (this.props.lowering) {
      if (!this.state.fetching) {
        return (
          <Modal size='lg' show={show} onHide={handleHide}>
            <Modal.Header closeButton>
              <Modal.Title as='h5'>{this.props.lowering.lowering_id} - Milestones / Stats</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Row className='mt-2'>
                <Col xs={12}>
                  <Map
                    style={{ height: this.state.height }}
                    center={this.state.center}
                    zoom={this.state.zoom}
                    onMoveEnd={this.handleMoveEnd}
                    onZoomEnd={this.handleZoomEnd}
                    ref={(map) => (this.map = map)}
                  >
                    <LayersControl position='topright'>{baseLayers}</LayersControl>
                    <ScaleControl position='bottomleft' />
                    {trackLine}
                    {startMarker}
                    {endMarker}
                    {this.renderMarker()}
                  </Map>
                </Col>
              </Row>
              <Row className='mt-2'>
                <Col xs={12}>{depth_profile}</Col>
              </Row>
              <Row className='mt-2'>{milestones_and_stats}</Row>
              <Row className='mt-2'>
                <Col xs={12}>
                  {renderAlert(this.props.errorMessage)}
                  {renderMessage(this.props.message)}
                </Col>
              </Row>
              <Row className='mt-2'>
                <Col xs={12}>
                  <span className='float-end'>
                    {!this.state.show_edit_form ? (
                      <Button className='me-1' variant='outline-warning' size='sm' onClick={() => this.handleShowEditForm()}>
                        Tweak!
                      </Button>
                    ) : null}
                    {!this.state.show_edit_form ? (
                      <Button className='me-1' variant='outline-secondary' size='sm' onClick={handleHide}>
                        Cancel
                      </Button>
                    ) : null}
                    {!this.state.show_edit_form ? (
                      <Button
                        className='me-1'
                        variant='outline-primary'
                        size='sm'
                        disabled={!this.state.touched}
                        onClick={() => this.handleUpdateLowering()}
                      >
                        Update
                      </Button>
                    ) : null}
                  </span>
                </Col>
              </Row>
            </Modal.Body>
          </Modal>
        )
      } else {
        return (
          <Modal size='lg' show={show} onHide={handleHide}>
            <Modal.Body>Loading...</Modal.Body>
          </Modal>
        )
      }
    } else {
      return null
    }
  }
}

LoweringStatsModal.propTypes = {
  errorMessage: PropTypes.string,
  event_templates: PropTypes.array,
  fetchEventTemplates: PropTypes.func.isRequired,
  handleHide: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  lowering: PropTypes.object,
  message: PropTypes.string,
  show: PropTypes.bool.isRequired,
  updateLowering: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    lowering: state.lowering.lowering,
    event_templates: state.event_template.event_templates,
    errorMessage: state.lowering.lowering_error,
    message: state.lowering.lowering_message
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'setLoweringStats', destroyOnHide: true })
)(LoweringStatsModal)
