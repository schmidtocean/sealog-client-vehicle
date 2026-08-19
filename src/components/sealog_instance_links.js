import React from 'react'
import { ROOT_PATH } from '../client_settings'

const instanceIconStyle = {
  height: '32px',
  width: '32px',
  objectFit: 'contain'
}

const baseBackgroundColor = 'rgba(255, 255, 255, 0.08)'
const baseBorderColor = 'rgba(255, 255, 255, 0.16)'
const hoverBackgroundColor = 'rgba(255, 255, 255, 0.16)'
const hoverBorderColor = 'rgba(255, 255, 255, 0.28)'

const fixedLinkBaseStyle = {
  height: '38px',
  margin: '2px',
  padding: '2px',
  position: 'fixed',
  bottom: 0,
  width: '38px',
  zIndex: 1040,
  backgroundColor: baseBackgroundColor,
  border: `1px solid ${baseBorderColor}`,
  borderRadius: '4px',
  transition: 'background-color 120ms ease, border-color 120ms ease'
}

const instanceLinks = {
  sub: {
    href: '/sealog-sub',
    image: 'sub.png',
    label: 'Subastian Sealog'
  },
  fkt: {
    href: '/sealog-fkt',
    image: 'fkt.png',
    label: 'Falkor (too) Sealog'
  }
}

const rootHref = (path) => {
  if (typeof window === 'undefined') {
    return path
  }

  return `${window.location.protocol}//${window.location.host}${path}`
}

const SealogInstanceLink = ({ instance, style }) => (
  <a
    className='d-inline-flex align-items-center justify-content-center'
    href={rootHref(instance.href)}
    aria-label={instance.label}
    style={{ ...fixedLinkBaseStyle, ...style }}
    title={instance.label}
    onMouseEnter={(event) => {
      event.currentTarget.style.backgroundColor = hoverBackgroundColor
      event.currentTarget.style.borderColor = hoverBorderColor
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.backgroundColor = baseBackgroundColor
      event.currentTarget.style.borderColor = baseBorderColor
    }}
  >
    <img alt={instance.label} src={`${ROOT_PATH}images/${instance.image}`} style={instanceIconStyle} />
  </a>
)

const SealogInstanceLinks = () => (
  <>
    <SealogInstanceLink instance={instanceLinks.sub} style={{ left: 0 }} />
    <SealogInstanceLink instance={instanceLinks.fkt} style={{ right: 0 }} />
  </>
)

export default SealogInstanceLinks
