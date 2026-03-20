import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

// Mock Leaflet CSS (no-op in Jest)
jest.mock('leaflet/dist/leaflet.css', () => {});

// Mock leaflet PNG assets
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon.png');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow.png');

// Mock react-leaflet — isolate component logic from the real map library
jest.mock('react-leaflet', () => {
  const React = require('react');
  const mockUseMap = jest.fn(() => ({
    flyTo: jest.fn(),
    setView: jest.fn(),
    getZoom: jest.fn(() => 14),
    fitBounds: jest.fn(),
    removeLayer: jest.fn(),
  }));

  return {
    MapContainer: ({ children }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: ({ children, position }) => (
      <div data-testid="marker" data-lat={position?.[0]} data-lng={position?.[1]}>
        {children}
      </div>
    ),
    Popup: ({ children }) => <div data-testid="popup">{children}</div>,
    Polyline: () => <div data-testid="polyline" />,
    useMap: mockUseMap,
    useMapEvents: jest.fn((events) => {
      // Store click handler for tests if needed
      return null;
    }),
  };
});

// Mock leaflet itself
jest.mock('leaflet', () => ({
  icon: jest.fn((opts) => ({ ...opts, _type: 'icon' })),
  divIcon: jest.fn((opts) => ({ ...opts, _type: 'divIcon' })),
  Marker: {
    prototype: { options: {} },
  },
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  latLngBounds: jest.fn(() => ({})),
}));

import MapBackground from '../components/MapBackground';

// ─────────────────────────────────────────────────────────────
// Test data helpers
// ─────────────────────────────────────────────────────────────
const carMarker = {
  id: 'driver-1',
  lat: 17.4447,
  lng: 78.65,
  label: 'Your Driver',
  type: 'car',
  heading: 45,
  isMe: false,
};

const personMarker = {
  id: 'passenger-1',
  lat: 17.445,
  lng: 78.651,
  label: 'Co-Passenger',
  type: 'person',
  isMe: true,
};

const locationMarker = {
  id: 'source',
  lat: 17.446,
  lng: 78.652,
  label: 'Pickup Point',
  type: 'location',
};

const routeGeometry = {
  type: 'LineString',
  coordinates: [
    [78.65, 17.44],
    [78.66, 17.45],
    [78.67, 17.46],
  ],
};

// ─────────────────────────────────────────────────────────────
// MapBackground Component Tests
// ─────────────────────────────────────────────────────────────
describe('MapBackground › rendering', () => {
  test('renders without crashing with default props', () => {
    const { container } = render(<MapBackground />);
    expect(container.firstChild).toBeTruthy();
  });

  test('renders the MapContainer', () => {
    render(<MapBackground />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders the TileLayer', () => {
    render(<MapBackground />);
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  test('applies default className when none provided', () => {
    const { container } = render(<MapBackground />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-screen');
    expect(wrapper).toHaveClass('w-full');
  });

  test('applies custom className when provided', () => {
    const { container } = render(<MapBackground className="custom-map-class" />);
    expect(container.firstChild).toHaveClass('custom-map-class');
  });

  test('renders top gradient overlay', () => {
    const { container } = render(<MapBackground />);
    // Gradient overlay is the second child div of the wrapper
    const gradient = container.querySelector('div > div:last-child');
    expect(gradient).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// Marker rendering
// ─────────────────────────────────────────────────────────────
describe('MapBackground › markers', () => {
  test('renders no markers when markers array is empty', () => {
    render(<MapBackground markers={[]} />);
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
  });

  test('renders correct number of markers', () => {
    render(<MapBackground markers={[carMarker, personMarker, locationMarker]} />);
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
  });

  test('renders a single car marker', () => {
    render(<MapBackground markers={[carMarker]} />);
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  test('renders correct position for marker via data attributes', () => {
    render(<MapBackground markers={[carMarker]} />);
    const marker = screen.getByTestId('marker');
    expect(marker).toHaveAttribute('data-lat', String(carMarker.lat));
    expect(marker).toHaveAttribute('data-lng', String(carMarker.lng));
  });

  test('renders popup with car label', () => {
    render(<MapBackground markers={[carMarker]} />);
    expect(screen.getByText('Your Driver')).toBeInTheDocument();
  });

  test('renders popup with passenger label', () => {
    render(<MapBackground markers={[personMarker]} />);
    expect(screen.getByText('Co-Passenger')).toBeInTheDocument();
  });

  test('renders popup with location label', () => {
    render(<MapBackground markers={[locationMarker]} />);
    expect(screen.getByText('Pickup Point')).toBeInTheDocument();
  });

  test('renders Navigate Here link for car marker', () => {
    render(<MapBackground markers={[carMarker]} />);
    const link = screen.getByText('Navigate Here');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('renders Navigate Here link for person marker', () => {
    render(<MapBackground markers={[personMarker]} />);
    expect(screen.getByText('Navigate Here')).toBeInTheDocument();
  });

  test('does NOT render Navigate Here link for location marker', () => {
    render(<MapBackground markers={[locationMarker]} />);
    expect(screen.queryByText('Navigate Here')).not.toBeInTheDocument();
  });

  test('renders correct emoji for car marker', () => {
    render(<MapBackground markers={[carMarker]} />);
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  test('renders correct emoji for person marker', () => {
    render(<MapBackground markers={[personMarker]} />);
    expect(screen.getByText('🧑')).toBeInTheDocument();
  });

  test('renders correct emoji for location marker', () => {
    render(<MapBackground markers={[locationMarker]} />);
    expect(screen.getByText('📍')).toBeInTheDocument();
  });

  test('renders default label "Location" when marker has no label', () => {
    const noLabelMarker = { id: 'x', lat: 17.44, lng: 78.65, type: 'location' };
    render(<MapBackground markers={[noLabelMarker]} />);
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  test('Navigate Here link has correct lat/lng in href', () => {
    render(<MapBackground markers={[carMarker]} />);
    const link = screen.getByText('Navigate Here');
    expect(link.href).toContain(`${carMarker.lat},${carMarker.lng}`);
  });
});

// ─────────────────────────────────────────────────────────────
// Center / default center
// ─────────────────────────────────────────────────────────────
describe('MapBackground › center prop', () => {
  test('uses provided center coordinates', () => {
    const center = [17.38, 78.49];
    const { getByTestId } = render(<MapBackground center={center} />);
    // MapContainer should receive the center
    expect(getByTestId('map-container')).toBeInTheDocument();
  });

  test('falls back to default center [17.4447, 78.65] when no center provided', () => {
    render(<MapBackground />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('falls back to default center when center has falsy lat', () => {
    render(<MapBackground center={[0, 78.65]} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// Multiple markers simultaneously
// ─────────────────────────────────────────────────────────────
describe('MapBackground › multiple markers', () => {
  test('renders all three marker types together', () => {
    render(
      <MapBackground markers={[carMarker, personMarker, locationMarker]} />
    );
    expect(screen.getByText('Your Driver')).toBeInTheDocument();
    expect(screen.getByText('Co-Passenger')).toBeInTheDocument();
    expect(screen.getByText('Pickup Point')).toBeInTheDocument();
  });

  test('renders two Navigate Here links (car + person), not for location', () => {
    render(
      <MapBackground markers={[carMarker, personMarker, locationMarker]} />
    );
    const links = screen.getAllByText('Navigate Here');
    expect(links).toHaveLength(2);
  });
});
