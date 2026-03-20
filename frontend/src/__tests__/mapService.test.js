import axios from 'axios';
import { searchLocation } from '../services/mapService';

// Mock axios so no real HTTP requests are made
jest.mock('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const mockResults = [
  {
    place_id: 1,
    display_name: 'Hyderabad, Telangana, India',
    lat: '17.3850',
    lon: '78.4867',
    address: { city: 'Hyderabad', country: 'India' },
  },
  {
    place_id: 2,
    display_name: 'Hyderguda, Hyderabad, Telangana, India',
    lat: '17.3890',
    lon: '78.4900',
    address: { suburb: 'Hyderguda', city: 'Hyderabad', country: 'India' },
  },
];

// ─────────────────────────────────────────────────────────
// searchLocation - Input validation tests
// ─────────────────────────────────────────────────────────
describe('mapService › searchLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Guard clauses ──
  test('returns empty array when query is undefined', async () => {
    const result = await searchLocation(undefined);
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('returns empty array when query is null', async () => {
    const result = await searchLocation(null);
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('returns empty array when query is empty string', async () => {
    const result = await searchLocation('');
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('returns empty array when query has fewer than 3 characters', async () => {
    const result = await searchLocation('Hy');
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('returns empty array when query is exactly 2 characters', async () => {
    const result = await searchLocation('ab');
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  // ── Successful requests ──
  test('calls Nominatim API with correct params for valid query', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    await searchLocation('Hyderabad');

    expect(axios.get).toHaveBeenCalledWith(NOMINATIM_URL, {
      params: {
        q: 'Hyderabad',
        format: 'json',
        addressdetails: 1,
        limit: 5,
        countrycodes: 'in',
      },
    });
  });

  test('returns API data on successful response', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    const result = await searchLocation('Hyderabad');

    expect(result).toEqual(mockResults);
    expect(result).toHaveLength(2);
  });

  test('returns results for exactly 3-character query (boundary value)', async () => {
    axios.get.mockResolvedValue({ data: [mockResults[0]] });

    const result = await searchLocation('Hyd');

    expect(axios.get).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  test('restricts search to India (countrycodes = in)', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    await searchLocation('Mumbai');

    const callArgs = axios.get.mock.calls[0][1];
    expect(callArgs.params.countrycodes).toBe('in');
  });

  test('limits results to 5 (limit param)', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    await searchLocation('Delhi');

    const callArgs = axios.get.mock.calls[0][1];
    expect(callArgs.params.limit).toBe(5);
  });

  test('requests json format', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    await searchLocation('Pune');

    const callArgs = axios.get.mock.calls[0][1];
    expect(callArgs.params.format).toBe('json');
  });

  test('returns empty array when API returns empty array', async () => {
    axios.get.mockResolvedValue({ data: [] });

    const result = await searchLocation('Xyzqwerty');

    expect(result).toEqual([]);
  });

  // ── Error handling ──
  test('returns empty array on network error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error('Network Error'));

    const result = await searchLocation('Hyderabad');

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  test('logs error to console on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('Network Error');
    axios.get.mockRejectedValue(networkError);

    await searchLocation('Hyderabad');

    expect(consoleSpy).toHaveBeenCalledWith('Geocoding error:', networkError);
    consoleSpy.mockRestore();
  });

  test('returns empty array on 500 server error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValue({ response: { status: 500, data: 'Server Error' } });

    const result = await searchLocation('Chennai');

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  test('handles special characters in query', async () => {
    axios.get.mockResolvedValue({ data: mockResults });

    const result = await searchLocation('Bengaluru, Karnataka');

    expect(axios.get).toHaveBeenCalledWith(
      NOMINATIM_URL,
      expect.objectContaining({
        params: expect.objectContaining({ q: 'Bengaluru, Karnataka' }),
      })
    );
    expect(result).toEqual(mockResults);
  });
});
