import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { connectModal } from 'redux-modal';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Map, TileLayer, WMSTileLayer, Marker, Polyline, Popup, LayersControl, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import Highcharts from 'highcharts';
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsNoDataToDisplay from "highcharts/modules/no-data-to-display";
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { Button, Row, Col, Form, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { renderAlert, renderMessage } from './form_elements';
import UpdateLoweringStatsForm from './update_lowering_stats_form';
import { API_ROOT_URL, CUSTOM_LOWERING_NAME } from '../client_config';
import { DEFAULT_LOCATION, TILE_LAYERS } from '../map_tilelayers';
import * as mapDispatchToProps from '../actions';

HighchartsExporting(Highcharts);
HighchartsNoDataToDisplay(Highcharts);

const { BaseLayer } = LayersControl

const cookies = new Cookies();
const MILESTONE_OPTION_NAME = 'milestone';
const LOWERING_START_MILESTONE = 'lowering_start';
const LOWERING_STOP_MILESTONE = 'lowering_stop';

class SetLoweringStatsModal extends Component {

  constructor (props) {
    super(props);

    this.state = {
      lowering: {},
      lowering_name: (CUSTOM_LOWERING_NAME)? CUSTOM_LOWERING_NAME[0].charAt(0).toUpperCase() + CUSTOM_LOWERING_NAME[0].slice(1) : "Lowering",

      posDataSource: null,

      event: null,

      fetching: false,
      tracklines: {},
      events: [],
      hideASNAP: true,

      show_edit_form: false,

      zoom: 13,
      center:DEFAULT_LOCATION,
      position:DEFAULT_LOCATION,
      showMarker: false,
      height: "400px",

      milestone_to_edit: null,
      milestones: this.getInitialMilestones(props),
      stats: {
        max_depth: (this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.max_depth) ? this.props.lowering.lowering_additional_meta.stats.max_depth : null,
        bounding_box: (this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.bounding_box) ? this.props.lowering.lowering_additional_meta.stats.bounding_box : []
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
          plotLines: []
        },
        yAxis: {
          title: {
            text: null,
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
            },
          }
        }
      }
    }

    this.auxDatasourceFilters = ['vehicleRealtimeNavData','vehicleRealtimeUSBLData'];

    this.handleMoveEnd = this.handleMoveEnd.bind(this);
    this.handleZoomEnd = this.handleZoomEnd.bind(this);
    this.initMapView = this.initMapView.bind(this);
    this.setEventbyTS = this.setEventbyTS.bind(this);
    this.clearEvent = this.clearEvent.bind(this);
    this.handleTweak = this.handleTweak.bind(this);
    this.handleShowEditForm = this.handleShowEditForm.bind(this);
    this.toggleASNAP = this.toggleASNAP.bind(this);

  }

  static propTypes = {
    lowering: PropTypes.object,
    event_templates: PropTypes.array,
    handleHide: PropTypes.func.isRequired,
    handleUpdateLowering: PropTypes.func,
    message: PropTypes.string,
    errorMessage: PropTypes.string
  };

  componentDidMount() {
    this.props.fetchEventTemplates();
    this.initEvents(this.props.lowering.id);
    this.initLoweringTrackline(this.props.lowering.id);
    this.setPlotLines();
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state.milestones !== prevState.milestones) {
      this.setPlotLines();
    }

    if(this.state.milestone_to_edit !== prevState.milestone_to_edit) {
      this.setPlotLines();
    }

    if(this.props.event_templates !== prevProps.event_templates && this.state.posDataSource) {
      this.setState((prevState) => {
        return { depthChartOptions: { ...prevState.depthChartOptions, series: this.getDepthChartSeries(prevState.posDataSource, prevState.tracklines, prevState.events, prevState.hideASNAP) } }
      });
    }

  }

  componentWillUnmount() {
    if (this.props.lowering) {
      this.props.initLowering(this.props.lowering.id)
    }
  }

  getSavedMilestones(props = this.props) {
    return (props.lowering.lowering_additional_meta && props.lowering.lowering_additional_meta.milestones) ? props.lowering.lowering_additional_meta.milestones : {};
  }

  getInitialMilestones(props = this.props) {
    return {
      [LOWERING_START_MILESTONE]: props.lowering.start_ts,
      ...this.getSavedMilestones(props),
      [LOWERING_STOP_MILESTONE]: props.lowering.stop_ts,
    }
  }

  getMilestoneKey(template) {
    if(!template.event_options) {
      return null;
    }

    const milestoneOption = template.event_options.find((option) => option.event_option_name === MILESTONE_OPTION_NAME)

    if(!milestoneOption) {
      return null;
    }

    if(milestoneOption.event_option_default_value) {
      return milestoneOption.event_option_default_value;
    }

    if(Array.isArray(milestoneOption.event_option_values) && milestoneOption.event_option_values.length === 1) {
      return milestoneOption.event_option_values[0];
    }

    return null;
  }

  getMilestoneTemplates(props = this.props) {
    const event_templates = props.event_templates || [];
    const seen = new Set();

    return event_templates.reduce((milestones, template) => {
      if(template.disabled) {
        return milestones;
      }

      const key = this.getMilestoneKey(template);
      if(!key || seen.has(key)) {
        return milestones;
      }

      seen.add(key);
      milestones.push({
        key,
        label: key
      });

      return milestones;
    }, []);
  }

  formatMilestoneLabel(key) {
    return key.replace(/^lowering_/, '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  getMilestoneLabel(key) {
    const milestone = this.getMilestoneItems().find((item) => item.key === key);
    return milestone ? milestone.label : this.formatMilestoneLabel(key);
  }

  getMilestoneItems() {
    const items = [
      { key: LOWERING_START_MILESTONE, label: `${this.state.lowering_name} Start` },
      ...this.getMilestoneTemplates()
    ];
    const displayedKeys = new Set(items.map((item) => item.key));

    Object.keys(this.state.milestones).forEach((key) => {
      if(key !== LOWERING_START_MILESTONE && key !== LOWERING_STOP_MILESTONE && !displayedKeys.has(key)) {
        items.push({ key, label: this.formatMilestoneLabel(key) });
        displayedKeys.add(key);
      }
    });

    items.push({ key: LOWERING_STOP_MILESTONE, label: 'On Deck' });

    return items;
  }

  renderMilestoneItems() {
    return this.getMilestoneItems().map((milestone) => {
      return (
        <React.Fragment key={milestone.key}>
          <span className={(this.state.milestone_to_edit == milestone.key)? "text-warning" : ""} onClick={() => this.setMilestoneToEdit(milestone.key)}>{milestone.label}: {this.state.milestones[milestone.key]}</span><br/>
        </React.Fragment>
      )
    })
  }

  getDepthChartData(posDataSource, tracklines = this.state.tracklines, events = this.state.events, hideASNAP = this.state.hideASNAP) {
    if(!posDataSource || !tracklines[posDataSource]) {
      return [];
    }

    if(!hideASNAP) {
      return tracklines[posDataSource].depth;
    }

    const asnapTimestamps = new Set(events.filter((event) => event.event_value === 'ASNAP').map((event) => moment.utc(event.ts).valueOf()));
    return tracklines[posDataSource].depth.filter((depth) => !asnapTimestamps.has(depth[0]));
  }

  getEventMilestone(event) {
    return event.event_options ? event.event_options.find((option) => option.event_option_name === MILESTONE_OPTION_NAME) : null;
  }

  getNearestDepth(depthData, targetTS) {
    if(!depthData || depthData.length === 0) {
      return null;
    }

    return depthData.reduce((nearestDepth, depth) => {
      return (Math.abs(depth[0] - targetTS) < Math.abs(nearestDepth[0] - targetTS)) ? depth : nearestDepth;
    }, depthData[0]);
  }

  getMilestoneChartData(posDataSource, tracklines = this.state.tracklines, events = this.state.events) {
    if(!posDataSource || !tracklines[posDataSource]) {
      return [];
    }

    const milestoneValues = new Set(this.getMilestoneItems().map((milestone) => milestone.key));

    return events.reduce((milestoneData, event) => {
      const milestone = this.getEventMilestone(event);

      if(!milestone || !milestoneValues.has(milestone.event_option_value)) {
        return milestoneData;
      }

      const eventTS = moment.utc(event.ts).valueOf();
      const depth = this.getNearestDepth(tracklines[posDataSource].depth, eventTS);

      if(depth) {
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
        });
      }

      return milestoneData;
    }, []);
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
    ];
  }

  async initEvents() {

    const data = await axios.get(`${API_ROOT_URL}/api/v1/event_exports/bylowering/${this.props.lowering.id}`,
      {
        headers: {
        authorization: cookies.get('token')
        }
      }      
    ).then((response) => {

      return response.data

    }).catch((error) => {
      if(error.response.status !== 404) {
        console.log(error)
      }

      return []
    })

    return await data

  }

  async initLoweringTrackline() {
    this.setState({ fetching: true});

    let events = await this.initEvents()

    let tracklines = {}

    this.auxDatasourceFilters.map((auxDatasource) => {

      let trackline = {
        ts: [],
        polyline: L.polyline([]),
        depth: [],
      };
    
      events.map((event) => {

        let aux_data = event['aux_data'].find((aux_data => aux_data['data_source'] == auxDatasource))
        if(aux_data) {
          try {
            const rawLat = aux_data['data_array'].find(data => data['data_name'] == 'latitude');
            const rawLng = aux_data['data_array'].find(data => data['data_name'] == 'longitude');

            if(rawLat && rawLng) {
              const latLng = [ parseFloat(rawLat['data_value']), parseFloat(rawLng['data_value'])]
              if(latLng[0] != 0 && latLng[0] != 0) {
                trackline.polyline.addLatLng(latLng);
              }
            }

            trackline.ts.push(moment.utc(event['ts']).valueOf());
            trackline.depth.push([trackline.ts[trackline.ts.length-1], parseFloat(aux_data['data_array'].find(data => data['data_name'] == 'depth')['data_value'])]);
          }
          catch(err) {
            console.log("No latLng found, skipping...");
            console.error(err);
          }
        }
      })

      if(trackline.ts.length > 0) {
        tracklines[auxDatasource] = trackline
      }
    })

    for (let index=0;index<this.auxDatasourceFilters.length;index++) {
      if (tracklines[this.auxDatasourceFilters[index]]) {
        const posDataSource = this.auxDatasourceFilters[index];
        this.setState((prevState) => {
          return { events: events, tracklines: tracklines, fetching: false, depthChartOptions: { ...prevState.depthChartOptions, series: this.getDepthChartSeries(posDataSource, tracklines, events, prevState.hideASNAP) }, posDataSource: posDataSource }
        });

        break;
      }
    }

    if(this.state.fetching) {
      this.setState({ events: events, tracklines: tracklines, fetching: false }); 
    }

    this.initMapView();
  }

  initMapView() {

    if(this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      this.map.leafletElement.panTo(this.state.tracklines[this.state.posDataSource].polyline.getBounds().getCenter());
      this.map.leafletElement.fitBounds(this.state.tracklines[this.state.posDataSource].polyline.getBounds());
    }
  }

  handleShowEditForm() {
    this.setState((prevState) => { return { show_edit_form: !prevState.show_edit_form}})  
  }

  toggleASNAP() {
    this.setState((prevState) => {
      const hideASNAP = !prevState.hideASNAP;

      return {
        event: null,
        hideASNAP: hideASNAP,
        depthChartOptions: {
          ...prevState.depthChartOptions,
          series: this.getDepthChartSeries(prevState.posDataSource, prevState.tracklines, prevState.events, hideASNAP)
        }
      }
    });
  }

  handleTweak(milestones, stats) {

    const updatedMilestones = { ...this.state.milestones, ...milestones };

    this.setState({milestones: updatedMilestones, stats})

    const start_ts = moment.utc(updatedMilestones[LOWERING_START_MILESTONE]);
    const stop_ts = moment.utc(updatedMilestones[LOWERING_STOP_MILESTONE]);
    
    const newMilestones = {...updatedMilestones}
    delete newMilestones[LOWERING_START_MILESTONE];
    delete newMilestones[LOWERING_STOP_MILESTONE];

    const lowering_additional_meta = { ...this.props.lowering.lowering_additional_meta, milestones: newMilestones, stats }

    const newLoweringRecord = { ...this.props.lowering, start_ts, stop_ts, lowering_additional_meta }

    this.props.handleUpdateLowering(newLoweringRecord)
    this.setState({milestones: updatedMilestones, stats, touched: false, show_edit_form: false})
  }

  handleCalculateBoundingBox() {
    if(this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      let lowering_bounds = this.state.tracklines[this.state.posDataSource].polyline.getBounds()
      this.setState((prevState) => { return { touched: true, stats: { ...prevState.stats, bounding_box: [lowering_bounds.getNorth(),lowering_bounds.getEast(),lowering_bounds.getSouth(),lowering_bounds.getWest()] } } });
    }
  }

  handleCalculateMaxDepth() {
    if(this.state.tracklines[this.state.posDataSource] && this.state.tracklines[this.state.posDataSource].depth.length > 0) {
      let maxDepth = this.state.tracklines[this.state.posDataSource].depth.reduce((current_max_depth, depth) => {
        current_max_depth = (depth[1] > current_max_depth) ? depth[1] : current_max_depth
        return current_max_depth
      }, 0)

      this.setState((prevState) => { return { touched: true, stats: { ...prevState.stats, max_depth: maxDepth } } });
    }
  }

  handleClick() {
    if(this.state.milestone_to_edit) {
      this.setState((prevState) => { return { touched: true, milestones: { ...prevState.milestones, [prevState.milestone_to_edit]: prevState.event.ts } } });
      this.setMilestoneToEdit()
    }
  }

  handleUpdateLowering() {
    const newMilestones = { ...this.state.milestones };
    delete newMilestones[LOWERING_START_MILESTONE];
    delete newMilestones[LOWERING_STOP_MILESTONE];

    const newLoweringAdditionalMeta = { ...this.props.lowering.lowering_additional_meta, milestones: newMilestones, stats: this.state.stats }

    const newLoweringRecord = { ...this.props.lowering, start_ts: this.state.milestones[LOWERING_START_MILESTONE], stop_ts: this.state.milestones[LOWERING_STOP_MILESTONE], lowering_additional_meta: newLoweringAdditionalMeta }

    this.props.handleUpdateLowering(newLoweringRecord)
    this.setState({touched: false})
  }

  setMilestoneToEdit(milestone = null) {
    if(milestone !== null && milestone !== this.state.milestone_to_edit) {
      this.setState({milestone_to_edit: milestone})
    }
    else {
      this.setState({milestone_to_edit: null}) 
    }
  }

  setPlotLines() {

    let xAxis = this.state.depthChartOptions.xAxis
    xAxis.plotLines = []

    for (const [key, value] of Object.entries(this.state.milestones)) {
      if(value) {
        if(key === this.state.milestone_to_edit) {
          xAxis.plotLines.push({
              color: '#FF0000',
              width: 2,
              value: moment.utc(value).valueOf()
          })
        }
        else {
          xAxis.plotLines.push({
              color: '#CFCFCF',
              width: 2,
              value: moment.utc(value).valueOf()
          })
        }
      }
    }

    this.setState((prevState) => { return { depthChartOptions: { ...prevState.depthChartOptions, xAxis: xAxis } } });
  }

  clearEvent(){
    this.setState({event: null})
  }

  setEventbyTS(e) {
    let tsStr = moment.utc(e.target.x).toISOString();
    this.setState({event: this.state.events.find(event => event.ts === tsStr)});
  }

  tooltipFormatter() {
    if(!this.state.event) {
      return ''
    }

    let event_txt = `<b>EVENT: ${this.state.event.event_value}</b>`
    if(this.state.event.event_value === 'FREE_FORM') {
      event_txt = `<span>${event_txt}<br/><b>Text:</b> ${this.state.event.event_free_text}</span>`
    }
    else if(this.state.event.event_value === 'VEHICLE') {
      const milestone = this.state.event.event_options.find((option) => option['event_option_name'] === 'milestone')
      if(milestone) {
        event_txt = `<span>${event_txt}<br/><b>Milestone:</b> ${milestone['event_option_value']}</span>`
      }
    }

    return `${event_txt}<br/><span>${this.state.event.ts}</span><br/>
      ${(this.state.milestone_to_edit) ? '<span>Click to set ' + this.getMilestoneLabel(this.state.milestone_to_edit) + '.</span>' : '' }`
  }

  handleZoomEnd() {
    if(this.map) {
      this.setState({zoom: this.map.leafletElement.getZoom()});
    }
  }

  handleMoveEnd() {
    if(this.map) {
      this.setState({center: this.map.leafletElement.getCenter()});
    }
  }

  renderMarker() {

    if(this.state.event && this.state.event.aux_data) {

      const posData = this.state.event.aux_data.find((data) => data['data_source'] === this.state.posDataSource);
      if(!posData) {
        return null;
      }

      const rawLat = posData['data_array'].find(data => data['data_name'] == 'latitude')
      const rawLng = posData['data_array'].find(data => data['data_name'] == 'longitude')
      if( rawLat && rawLng ) {
        return (
          <Marker position={[ parseFloat(rawLat['data_value']), parseFloat(rawLng['data_value'])]}>
            <Popup>
              You are here! :-)
            </Popup>
          </Marker>
        );
      }
    }
  }

  render() {
    const { show, handleHide } = this.props

    const baseLayers = TILE_LAYERS.map((layer, index) => {
      if(layer.wms) {
        return (
          <BaseLayer checked={layer.default} key={`baseLayer_${index}`} name={layer.name}>
            <WMSTileLayer
              attribution={layer.attribution}
              url={layer.url}
              layers={layer.layers}
              transparent={layer.transparent}
            />
          </BaseLayer>
        )
      }
      else {
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

    const milestones_and_stats = (this.state.show_edit_form) ?
      <Col md={12}>
        <UpdateLoweringStatsForm milestones={this.state.milestones} stats={this.state.stats} handleHide={this.handleShowEditForm} handleFormSubmit={this.handleTweak}/>
      </Col>
    : [<Col key="milestones" md={6}>
        <div>
          {this.renderMilestoneItems()}
        </div>
      </Col>,
      <Col key="stats" md={6}>
        <div>
          <span>Max Depth: {this.state.stats.max_depth} <OverlayTrigger placement="top" overlay={<Tooltip id="maxDepthTooltip">Click to calculate max depth from depth data.</Tooltip>}><FontAwesomeIcon className="text-primary" onClick={ () => this.handleCalculateMaxDepth() } icon='calculator' fixedWidth/></OverlayTrigger></span><br/>
          <span>Bounding Box: {(this.state.stats.bounding_box) ? this.state.stats.bounding_box.join(", ") : ""}  <OverlayTrigger placement="top" overlay={<Tooltip id="boundingBoxTooltip">Click to calculate the bounding box from position data.</Tooltip>}><FontAwesomeIcon className="text-primary" onClick={ () => this.handleCalculateBoundingBox() } icon='calculator' fixedWidth/></OverlayTrigger></span><br/>
        </div>
      </Col>]     

    const depth_profile = 
      <div>
        <div className="">
          <Form.Check id="setLoweringStatsASNAP" type='switch' inline checked={!this.state.hideASNAP} onChange={() => this.toggleASNAP()} label='ASNAP'/>
        </div>
        <HighchartsReact
          highcharts={Highcharts}
          options={this.state.depthChartOptions}
          oneToOne={true}
        />
      </div>

    const trackLine = (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) ?
      <Polyline color="lime" positions={this.state.tracklines[this.state.posDataSource].polyline.getLatLngs()} />
    : null;
    
    if(this.props.lowering) {
      if(!this.state.fetching) {
        return (
          <Modal size="lg" show={show} onHide={handleHide}>
            <Modal.Header closeButton>
              <Modal.Title as="h5">{this.props.lowering.lowering_id} - Milestones / Stats</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Row className="mt-2">
                <Col xs={12}>
                  <Map
                    style={{ height: this.state.height }}
                    center={this.state.center}
                    zoom={this.state.zoom}
                    onMoveEnd={this.handleMoveEnd}
                    onZoomEnd={this.handleZoomEnd}
                    ref={ (map) => this.map = map}
                  >
                  <LayersControl position="topright">
                    {baseLayers}
                  </LayersControl>
                  <ScaleControl position="bottomleft" />
                    {trackLine}
                    {this.renderMarker()}
                  </Map>
                </Col>
              </Row>
              <Row className="mt-2">
                <Col xs={12}>
                  {depth_profile}
                </Col>
              </Row>
              <Row className="mt-2">
                {milestones_and_stats}
              </Row>
              <Row className="mt-2">
                <Col xs={12}>
                  {renderAlert(this.props.errorMessage)}
                  {renderMessage(this.props.message)}
                </Col>
              </Row>
              <Row className="mt-2">
                <Col xs={12}>
                  <span className="float-right">
                    {(!this.state.show_edit_form) ? <Button className="mr-1" variant="warning" size="sm" onClick={() => this.handleShowEditForm()}>Tweak!</Button> : null}
                    {(!this.state.show_edit_form) ? <Button className="mr-1" variant="secondary" size="sm" onClick={handleHide}>Close</Button> : null}
                    {(!this.state.show_edit_form) ? <Button className="mr-1" variant="primary" size="sm" disabled={!this.state.touched} onClick={() => this.handleUpdateLowering()}>Update</Button> : null}
                  </span>
                </Col>
              </Row>
            </Modal.Body>
          </Modal>
        );
      } else {
        return (
          <Modal size="lg" show={show} onHide={handleHide}>
            <Modal.Body>
              Loading...
            </Modal.Body>
          </Modal>
        );
      }
    }
    else {
      return null;
    }
  }
}

function mapStateToProps(state) {

  return {
    roles: state.user.profile.roles,
    errorMessage: state.lowering.lowering_error,
    message: state.lowering.lowering_message,
    event_templates: state.event_template.event_templates.length > 0 ? state.event_template.event_templates : state.event_history.event_templates,
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'setLoweringStats', destroyOnHide: true })
)(SetLoweringStatsModal);
