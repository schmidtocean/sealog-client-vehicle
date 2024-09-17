import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Row, Col, Card, Image } from 'react-bootstrap';
import CustomPagination from './custom_pagination';
import * as mapDispatchToProps from '../actions';
import { getImageUrl, handleMissingImage } from '../utils';
import { debounce } from 'lodash';

// const maxImagesPerPage = 16

class LoweringGalleryTab extends Component {

  constructor (props) {
    super(props);

    this.state = {
      activePage: 1,
      imagesToRender: []
    }

    this.handlePageSelect = this.handlePageSelect.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.debouncedLoadImages = debounce(this.loadImagesForPage, 100);
  }

  static propTypes = {
    imagesSource: PropTypes.string.isRequired,
    imagesData: PropTypes.object.isRequired,
    maxImagesPerPage: PropTypes.number.isRequired
  };

  componentDidMount() {
    this.loadImagesForPage(this.state.activePage);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.maxImagesPerPage !== this.props.maxImagesPerPage) {
      this.loadImagesForPage(this.state.activePage);
    }
  }

  componentWillUnmount() {
    this.debouncedLoadImages.cancel();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT') {
      return;
    }

    const maxPage = Math.ceil(this.props.imagesData.images.length / this.props.maxImagesPerPage);
    if(event.key === "ArrowRight" && this.state.activePage < maxPage) {
      this.handlePageSelect(this.state.activePage + 1)
    }
    else if(event.key === "ArrowLeft" && this.state.activePage > 1) {
      this.handlePageSelect(this.state.activePage - 1)
    }
  }

  handlePageSelect(eventKey) {
    this.setState({activePage: eventKey}, () => {
      this.debouncedLoadImages(eventKey);
    });
  }

  loadImagesForPage(page) {
    const startIndex = (page - 1) * this.props.maxImagesPerPage;
    const endIndex = startIndex + this.props.maxImagesPerPage;
    const imagesToRender = this.props.imagesData.images.slice(startIndex, endIndex);

    this.setState({
      imagesToRender
    });
  }

  handleEventShowDetailsModal(event_id) {
    this.props.showModal('eventShowDetails', { event: { id: event_id } , handleUpdateEvent: this.props.updateEvent });
  }

  renderImage(source, filepath, event_id) {
    const gcsFilepath = getImageUrl(this.props.cruise.cruise_id, this.props.lowering.lowering_id, filepath);
    return (
      <Card className="event-image-data-card" id={`image_${source}`}>
        <Image fluid onClick={ () => this.handleEventShowDetailsModal(event_id) } onError={handleMissingImage} src={filepath}/>
      </Card>
    )
  }

  renderGallery(imagesSource) {
    return this.state.imagesToRender.map((image) => {
      return (
        <Col className="m-0 p-1" key={`${imagesSource}_${image.event_id}`} xs={12} sm={6} md={4} lg={3}>
          {this.renderImage(imagesSource, image.filepath, image.event_id)}
        </Col>
      )
    })
  }

  render(){
    return (
      <React.Fragment>
        <Row key={`${this.props.imagesSource}_images_pagination`}>
          <CustomPagination className="mt-2" page={this.state.activePage} count={(this.props.imagesData.images)? this.props.imagesData.images.length : 0} pageSelectFunc={this.handlePageSelect} maxPerPage={this.props.maxImagesPerPage}/>
        </Row>
        <Row key={`${this.props.imagesSource}_images`}>
          {this.renderGallery(this.props.imagesSource)}
        </Row>
      </React.Fragment>
    )
  }
}

function mapStateToProps(state) {

  return {
    cruise: state.cruise.cruise,
    lowering: state.lowering.lowering
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(LoweringGalleryTab);
