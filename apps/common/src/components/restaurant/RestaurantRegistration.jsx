import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store, MapPin, Plus, Trash2, CheckCircle2,
  IndianRupee, Image as ImageIcon,
  UploadCloud, FileText, Navigation, LocateFixed, Loader, Search, Crosshair, ExternalLink,
  MousePointerClick, Check
} from 'lucide-react';

export default function RestaurantRegistration({ onRestaurantSaved }) {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  // ── Basic Info ──────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineInput, setCuisineInput] = useState('');
  const [region, setRegion] = useState('Bengaluru');

  // ── Contact ─────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');

  // ── Address – split fields ──────────────────────────────────────────────
  const [buildingNo, setBuildingNo] = useState('');
  const [street, setStreet] = useState('');
  const [taluk, setTaluk] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');

  // ── GPS / Geofence ──────────────────────────────────────────────────────
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [accuracyMeters, setAccuracyMeters] = useState(null);
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [mapSelectedCoords, setMapSelectedCoords] = useState(null);

  // ── Leaflet Map Refs ────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const confirmedMarkerRef = useRef(null);
  const pendingMarkerRef = useRef(null);

  // ── Location Search ─────────────────────────────────────────────────────
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // ── Cover image ─────────────────────────────────────────────────────────
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'
  );
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [coverFileName, setCoverFileName] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef(null);

  // ── Bill image ──────────────────────────────────────────────────────────
  const [billImage, setBillImage] = useState('');
  const [billImagePreview, setBillImagePreview] = useState('');
  const [billFileName, setBillFileName] = useState('');
  const [billFileSize, setBillFileSize] = useState('');
  const [uploadingBill, setUploadingBill] = useState(false);
  const billFileInputRef = useRef(null);

  // ── Menu – starts empty ─────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Mains');
  const [newItemDesc, setNewItemDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const PRESET_LOCATIONS = [
    { label: 'Bengaluru Central', city: 'Bengaluru', taluk: 'Bengaluru North', state: 'Karnataka', country: 'India', lat: '12.9716', lng: '77.5946' },
    { label: 'Bengaluru Indiranagar', city: 'Bengaluru', taluk: 'Bengaluru East', state: 'Karnataka', country: 'India', lat: '12.9784', lng: '77.6408' },
    { label: 'Bengaluru Koramangala', city: 'Bengaluru', taluk: 'Bengaluru South', state: 'Karnataka', country: 'India', lat: '12.9352', lng: '77.6245' },
    { label: 'Mysuru City', city: 'Mysuru', taluk: 'Mysuru Taluk', state: 'Karnataka', country: 'India', lat: '12.2958', lng: '76.6394' },
    { label: 'Mangaluru', city: 'Mangaluru', taluk: 'Mangaluru Taluk', state: 'Karnataka', country: 'India', lat: '12.9141', lng: '74.8560' },
    { label: 'Chennai T. Nagar', city: 'Chennai', taluk: 'Mambalam', state: 'Tamil Nadu', country: 'India', lat: '13.0418', lng: '80.2341' },
    { label: 'Mumbai Bandra', city: 'Mumbai', taluk: 'Bandra Suburban', state: 'Maharashtra', country: 'India', lat: '19.0596', lng: '72.8295' },
    { label: 'Hyderabad Hitec', city: 'Hyderabad', taluk: 'Serilingampally', state: 'Telangana', country: 'India', lat: '17.4435', lng: '78.3772' },
  ];

  const TAMIL_TO_ENGLISH_MAP = {
    'தமிழ்நாடு': 'Tamil Nadu',
    'இந்தியா': 'India',
    'சென்னை': 'Chennai',
    'கோயம்புத்தூர்': 'Coimbatore',
    'மதுரை': 'Madurai',
    'திருச்சிராப்பள்ளி': 'Tiruchirappalli',
    'சேலம்': 'Salem',
    'திருநெல்வேலி': 'Tirunelveli',
    'திருப்பூர்': 'Tiruppur',
    'வேலூர்': 'Vellore',
    'ஈரோடு': 'Erode',
    'தூத்துக்குடி': 'Thoothukudi',
    'திண்டுக்கல்': 'Dindigul',
    'தஞ்சாவூர்': 'Thanjavur',
    'கர்நாடகா': 'Karnataka',
    'பெங்களூரு': 'Bengaluru',
    'மைசூர்': 'Mysuru',
  };

  const sanitizeToEnglish = (text, fallback = '') => {
    if (!text) return fallback;
    const str = String(text).trim();
    if (TAMIL_TO_ENGLISH_MAP[str]) return TAMIL_TO_ENGLISH_MAP[str];

    let converted = str;
    for (const [ta, en] of Object.entries(TAMIL_TO_ENGLISH_MAP)) {
      if (converted.includes(ta)) {
        converted = converted.replaceAll(ta, en);
      }
    }

    if (/[\u0B80-\u0BFF]/.test(converted)) {
      return fallback;
    }
    return converted;
  };

  /** Clean administrative district suffix (e.g. "Bengaluru Urban" -> "Bengaluru") */
  const cleanDistrict = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/(Central|South|North|East|West)?\s*(City\s*Corporation|Corporation|Mahanagara\s*Palike|Municipal\s*Corporation)/gi, '')
      .replace(/\s*(Urban|Rural|North|South|East|West|District|taluk|Taluk)/gi, '')
      .trim();
  };

  /** Clean taluk / tehsil name */
  const cleanTaluk = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/(City\s*Corporation|Corporation|Mahanagara\s*Palike|Municipal\s*Corporation)/gi, '')
      .replace(/\s*(District)/gi, '')
      .trim();
  };

  /** Custom SVG Pin for Leaflet Map */
  const createMapPinIcon = (isPending = false) => {
    const color = isPending ? '#FF5A36' : '#10B981';
    return L.divIcon({
      className: 'custom-foodtrail-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -100%);
          cursor: pointer;
        ">
          <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
            <path fill="${color}" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="3.2" fill="#FFFFFF" />
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -34],
    });
  };

  /**
   * Intelligently extract the true City/Town, Taluk, State, Country, and Road
   * from combined OpenStreetMap Nominatim and BigDataCloud responses.
   */
  const extractProperLocation = (osmAddr = {}, bdcData = null) => {
    const districtInfo = [
      osmAddr.state_district,
      osmAddr.city_district,
      osmAddr.county,
      osmAddr.city,
      bdcData?.city,
      bdcData?.locality,
    ].filter(Boolean).join(' ');

    let resolvedCity = '';

    if (/bengaluru|bangalore/i.test(districtInfo)) {
      resolvedCity = 'Bengaluru';
    } else if (/chennai|madras/i.test(districtInfo)) {
      resolvedCity = 'Chennai';
    } else if (/mumbai|bombay/i.test(districtInfo)) {
      resolvedCity = 'Mumbai';
    } else if (/hyderabad/i.test(districtInfo)) {
      resolvedCity = 'Hyderabad';
    } else if (/mysuru|mysore/i.test(districtInfo)) {
      resolvedCity = 'Mysuru';
    } else if (/delhi/i.test(districtInfo)) {
      resolvedCity = 'New Delhi';
    } else if (/kolkata|calcutta/i.test(districtInfo)) {
      resolvedCity = 'Kolkata';
    } else if (/pune|poona/i.test(districtInfo)) {
      resolvedCity = 'Pune';
    } else if (/coimbatore/i.test(districtInfo)) {
      resolvedCity = 'Coimbatore';
    } else if (/kochi|cochin/i.test(districtInfo)) {
      resolvedCity = 'Kochi';
    } else if (/ahmedabad/i.test(districtInfo)) {
      resolvedCity = 'Ahmedabad';
    } else if (/jaipur/i.test(districtInfo)) {
      resolvedCity = 'Jaipur';
    } else if (/chandigarh/i.test(districtInfo)) {
      resolvedCity = 'Chandigarh';
    } else if (osmAddr.city && !/District|Urban|Rural|Taluk/i.test(osmAddr.city)) {
      resolvedCity = osmAddr.city;
    } else if (bdcData?.city && !/taluk/i.test(bdcData.city)) {
      resolvedCity = bdcData.city;
    } else if (osmAddr.town) {
      resolvedCity = osmAddr.town;
    } else if (osmAddr.municipality) {
      resolvedCity = osmAddr.municipality;
    } else if (osmAddr.city_district) {
      resolvedCity = cleanDistrict(osmAddr.city_district);
    } else if (osmAddr.state_district) {
      resolvedCity = cleanDistrict(osmAddr.state_district);
    } else if (osmAddr.county) {
      resolvedCity = cleanDistrict(osmAddr.county);
    } else if (bdcData?.locality) {
      resolvedCity = bdcData.locality;
    } else if (osmAddr.suburb) {
      resolvedCity = osmAddr.suburb;
    } else if (osmAddr.village) {
      resolvedCity = osmAddr.village;
    }

    // Extract Taluk / Tehsil / Subdistrict
    let rawTaluk =
      osmAddr.taluk ||
      osmAddr.subdistrict ||
      osmAddr.tehsil ||
      osmAddr.county ||
      '';

    if (!rawTaluk && bdcData?.localityInfo?.administrative) {
      const adminTaluk = bdcData.localityInfo.administrative.find((a) =>
        /taluk|subdistrict|tehsil/i.test(a.description || a.name || '')
      );
      if (adminTaluk) rawTaluk = adminTaluk.name;
    }

    const resolvedTaluk = cleanTaluk(rawTaluk);

    const resolvedState =
      bdcData?.principalSubdivision ||
      osmAddr['state:en'] ||
      osmAddr.state ||
      '';

    const resolvedCountry =
      bdcData?.countryName ||
      osmAddr['country:en'] ||
      osmAddr.country ||
      'India';

    const resolvedRoad =
      osmAddr['road:en'] ||
      osmAddr.road ||
      osmAddr.pedestrian ||
      '';

    const resolvedSuburb =
      osmAddr['suburb:en'] ||
      osmAddr.suburb ||
      osmAddr.neighbourhood ||
      '';

    return {
      taluk: sanitizeToEnglish(resolvedTaluk.trim(), ''),
      city: sanitizeToEnglish(resolvedCity.trim(), ''),
      state: sanitizeToEnglish(resolvedState.trim(), 'Karnataka'),
      country: sanitizeToEnglish(resolvedCountry.trim(), 'India'),
      road: sanitizeToEnglish(resolvedRoad.trim(), ''),
      suburb: sanitizeToEnglish(resolvedSuburb.trim(), ''),
    };
  };

  /** Reverse geocode coordinates using both BigDataCloud and OpenStreetMap */
  const reverseGeocodeCoords = async (latitude, longitude) => {
    let bdcData = null;
    let osmData = null;

    try {
      const [bdcRes, osmRes] = await Promise.allSettled([
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        ).then((r) => (r.ok ? r.json() : null)),
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        ).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (bdcRes.status === 'fulfilled') bdcData = bdcRes.value;
      if (osmRes.status === 'fulfilled') osmData = osmRes.value;
    } catch (err) {
      console.warn('[Geocode error]', err);
    }

    return extractProperLocation(osmData?.address || {}, bdcData);
  };

  /** Set location selected on the interactive map */
  const handleSetLocationFromMap = async (targetLat, targetLng) => {
    const latStr = String(targetLat);
    const lngStr = String(targetLng);
    setLat(latStr);
    setLng(lngStr);
    setLocationGranted(true);
    setMapSelectedCoords(null);
    setFetchingLocation(true);

    try {
      const loc = await reverseGeocodeCoords(parseFloat(targetLat), parseFloat(targetLng));

      if (loc.taluk) setTaluk(loc.taluk);
      if (loc.city) setCity(loc.city);
      if (loc.state) setState(loc.state);
      if (loc.country) setCountry(loc.country);
      if (loc.city) setRegion(loc.city);

      if (!street && (loc.road || loc.suburb)) {
        setStreet([loc.suburb, loc.road].filter(Boolean).join(', '));
      }

      showToast(
        `📍 Location set: ${loc.taluk ? loc.taluk + ', ' : ''}${loc.city || ''} (${latStr}, ${lngStr})`,
        'success'
      );
    } catch (e) {
      showToast(`📍 Location coordinates locked: ${latStr}, ${lngStr}`, 'success');
    } finally {
      setFetchingLocation(false);
    }
  };

  /** Leaflet Map Lifecycle */
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const initialLat = parseFloat(lat) || 12.9716;
    const initialLng = parseFloat(lng) || 77.5946;
    const initialZoom = lat && lng ? 15 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    leafletMapRef.current = map;

    if (lat && lng) {
      const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
        icon: createMapPinIcon(false),
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1E293B; line-height: 1.4;">
          <strong style="color: #10B981;">✓ Confirmed Restaurant Pin</strong><br/>
          Lat: ${lat}<br/>
          Lng: ${lng}
        </div>
      `);
      confirmedMarkerRef.current = marker;

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setMapSelectedCoords({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
      });
    }

    map.on('click', (e) => {
      const clickedLat = e.latlng.lat.toFixed(6);
      const clickedLng = e.latlng.lng.toFixed(6);

      setMapSelectedCoords({ lat: clickedLat, lng: clickedLng });

      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.setLatLng([e.latlng.lat, e.latlng.lng]);
      } else {
        pendingMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: createMapPinIcon(true),
          draggable: true,
        }).addTo(map);

        pendingMarkerRef.current.on('dragend', (de) => {
          const pos = de.target.getLatLng();
          setMapSelectedCoords({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
        });
      }

      pendingMarkerRef.current.bindPopup(`
        <div style="font-family: sans-serif; min-width: 170px; text-align: center; padding: 2px;">
          <div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 2px;">📍 Pin Selected</div>
          <div style="font-size: 11px; color: #64748B; font-family: monospace; margin-bottom: 8px;">
            ${clickedLat}, ${clickedLng}
          </div>
          <button
            id="btn-popup-set-location"
            data-lat="${clickedLat}"
            data-lng="${clickedLng}"
            style="
              background: linear-gradient(135deg, #FF5A36 0%, #FF8A00 100%);
              color: #FFF;
              border: none;
              padding: 7px 14px;
              border-radius: 6px;
              font-weight: 700;
              font-size: 12px;
              cursor: pointer;
              width: 100%;
              box-shadow: 0 2px 6px rgba(255,90,54,0.4);
            "
          >
            ✓ Set Location
          </button>
        </div>
      `).openPopup();
    });

    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Delegate click for popup "Set Location" button
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const btn = e.target.closest('#btn-popup-set-location');
      if (btn) {
        const tLat = btn.getAttribute('data-lat');
        const tLng = btn.getAttribute('data-lng');
        if (tLat && tLng) {
          handleSetLocationFromMap(tLat, tLng);
        }
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Pan and update confirmed marker when lat/lng change
  useEffect(() => {
    if (!leafletMapRef.current || !lat || !lng) return;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) return;

    leafletMapRef.current.flyTo([numLat, numLng], 15, { duration: 0.8 });

    if (confirmedMarkerRef.current) {
      confirmedMarkerRef.current.setLatLng([numLat, numLng]);
    } else {
      confirmedMarkerRef.current = L.marker([numLat, numLng], {
        icon: createMapPinIcon(false),
        draggable: true,
      }).addTo(leafletMapRef.current);

      confirmedMarkerRef.current.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setMapSelectedCoords({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
      });
    }

    confirmedMarkerRef.current.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; color: #1E293B; line-height: 1.4;">
        <strong style="color: #10B981;">✓ Confirmed Restaurant Pin</strong><br/>
        Lat: ${lat}<br/>
        Lng: ${lng}
      </div>
    `);

    if (pendingMarkerRef.current) {
      leafletMapRef.current.removeLayer(pendingMarkerRef.current);
      pendingMarkerRef.current = null;
    }
  }, [lat, lng]);

  /** Request live location from browser and auto‑fill city, state, country, lat, lng */
  const handleRequestLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latStr = latitude.toFixed(6);
        const lngStr = longitude.toFixed(6);
        setLat(latStr);
        setLng(lngStr);
        setAccuracyMeters(accuracy ? Math.round(accuracy) : null);
        setLocationGranted(true);
        setMapSelectedCoords(null);

        try {
          const loc = await reverseGeocodeCoords(latitude, longitude);

          if (loc.taluk) setTaluk(loc.taluk);
          if (loc.city) setCity(loc.city);
          if (loc.state) setState(loc.state);
          if (loc.country) setCountry(loc.country);
          if (loc.city) setRegion(loc.city);

          if (!street && (loc.road || loc.suburb)) {
            setStreet([loc.suburb, loc.road].filter(Boolean).join(', '));
          }

          showToast(
            `📍 Location captured: ${loc.taluk ? loc.taluk + ', ' : ''}${loc.city ? loc.city + ', ' : ''}${loc.state || ''}`,
            'success'
          );
        } catch (e) {
          showToast('Captured coordinates! Failed to reverse‑geocode address name.', 'error');
        }
        setFetchingLocation(false);
      },
      (err) => {
        setFetchingLocation(false);
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          showToast('Location access denied. Please allow location permissions in your browser or search your address below.', 'error');
        } else {
          showToast('Unable to retrieve device GPS. You can search or pick your location below.', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  /** Search location / landmark / area using Nominatim Geocoder */
  const handleSearchLocation = async (e) => {
    if (e) e.preventDefault();
    const query = searchLocationQuery.trim();
    if (!query) {
      showToast('Please enter an address, landmark, or city to search.', 'info');
      return;
    }

    setSearchingLocation(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&addressdetails=1&limit=5`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      );
      if (!res.ok) throw new Error('Search request failed');
      const results = await res.json();
      if (!results || results.length === 0) {
        showToast(`No locations found matching "${query}". Try adding a city name.`, 'error');
      } else {
        setSearchResults(results);
        if (results.length === 1) {
          applySearchResult(results[0]);
        }
      }
    } catch (err) {
      console.error('[Search error]', err);
      showToast('Could not search location. Please check internet connection.', 'error');
    } finally {
      setSearchingLocation(false);
    }
  };

  const applySearchResult = (item) => {
    const pLat = parseFloat(item.lat).toFixed(6);
    const pLng = parseFloat(item.lon).toFixed(6);
    setLat(pLat);
    setLng(pLng);
    setLocationGranted(true);
    setSearchResults([]);
    setMapSelectedCoords(null);

    const loc = extractProperLocation(item.address || {}, null);

    if (loc.taluk) setTaluk(loc.taluk);
    if (loc.city) setCity(loc.city);
    if (loc.state) setState(loc.state);
    if (loc.country) setCountry(loc.country);
    if (loc.city) setRegion(loc.city);

    if (!street && (loc.road || loc.suburb)) {
      setStreet([loc.suburb, loc.road].filter(Boolean).join(', '));
    }

    showToast(`📍 Location set: ${loc.taluk ? loc.taluk + ', ' : ''}${loc.city || item.name}, ${loc.state || ''}`, 'success');
  };

  const handleApplyPreset = (preset) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setTaluk(preset.taluk || '');
    setCity(preset.city);
    setState(preset.state);
    setCountry(preset.country);
    setRegion(preset.city);
    setLocationGranted(true);
    setMapSelectedCoords(null);
    showToast(`📍 Preset applied: ${preset.taluk ? preset.taluk + ', ' : ''}${preset.city}, ${preset.state}`, 'info');
  };

  /** Upload JPG/PNG helper */
  const handleImageFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext) && !file.type.match(/^image\/(jpeg|png)$/)) {
      showToast('Please upload an image in JPG or PNG format only.', 'error');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    if (type === 'cover') {
      setCoverImagePreview(localUrl);
      setCoverFileName(file.name);
      setUploadingCover(true);
    } else {
      setBillImagePreview(localUrl);
      setBillFileName(file.name);
      setBillFileSize(sizeFormatted);
      setUploadingBill(true);
    }

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/restaurants/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        type === 'cover' ? setCoverImage(data.url) : setBillImage(data.url);
        showToast(`✅ ${type === 'cover' ? 'Cover photo' : 'Restaurant bill'} uploaded!`, 'success');
      } else {
        throw new Error('Server upload failed');
      }
    } catch {
      // fallback to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        type === 'cover' ? setCoverImage(reader.result) : setBillImage(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      type === 'cover' ? setUploadingCover(false) : setUploadingBill(false);
    }
  };

  const handleRemoveBill = () => {
    setBillImage('');
    setBillImagePreview('');
    setBillFileName('');
    setBillFileSize('');
    if (billFileInputRef.current) billFileInputRef.current.value = '';
    showToast('Restaurant bill image removed.', 'info');
  };

  const handleAddMenuItem = () => {
    if (!newItemName.trim() || !newItemPrice) {
      showToast('Dish name and price (₹) are required.', 'error');
      return;
    }
    setMenuItems([
      ...menuItems,
      {
        id: `m_${Date.now()}`,
        name: newItemName.trim(),
        price: parseFloat(newItemPrice) || 0,
        category: newItemCategory || 'Mains',
        description: newItemDesc.trim(),
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    showToast('Dish added to menu!', 'success');
  };

  const handleRemoveMenuItem = (id) =>
    setMenuItems(menuItems.filter((item) => item.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullAddress = [
      buildingNo,
      street,
      taluk ? `${taluk} Taluk` : '',
      city,
      state,
      country,
    ].filter(Boolean).join(', ');

    if (!name.trim()) {
      showToast('Restaurant name is required.', 'error');
      const el = document.getElementById('reg-restaurant-name');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const activeBill = billImage || billImagePreview;
    if (!activeBill) {
      showToast('Official restaurant bill / receipt upload is mandatory for verification.', 'error');
      const el = document.getElementById('reg-bill-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!fullAddress.trim()) {
      showToast('Restaurant address is required.', 'error');
      const el = document.getElementById('reg-building-no');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!lat || !lng) {
      showToast('Please provide location coordinates (use map selection or device GPS).', 'error');
      const el = document.getElementById('reg-location-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        address: fullAddress,
        taluk: taluk.trim(),
        buildingNo,
        street,
        city,
        state,
        country,
        region: (city || region || 'Bengaluru').trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        geofenceRadiusMeters: parseInt(geofenceRadius, 10),
        cuisine: cuisineInput.split(',').map((c) => c.trim()).filter(Boolean),
        priceRange: 'As per menu',
        phone,
        email,
        coverImage,
        billImage: billImage || billImagePreview || '',
        photos: [coverImage],
        menuItems,
      };

      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register restaurant');

      showToast('🎉 Restaurant registered successfully! Pending admin approval.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onRestaurantSaved) onRestaurantSaved(data.restaurant);
    } catch (err) {
      showToast(err.message || 'Registration error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-md)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(255,90,54,0.15)', border: '1px solid rgba(255,90,54,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Store size={26} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Register New Restaurant</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Fill in your restaurant details, upload a bill photo &amp; build your menu
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 1: Basic Profile                              */}
          {/* ══════════════════════════════════════════════════════ */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={sectionTitle}>1. Basic Profile &amp; Branding</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Restaurant Name *</label>
                <input
                  id="reg-restaurant-name"
                  type="text"
                  required
                  placeholder="e.g. Spice Pavilion / Peshawri Royal"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tagline / Subheading</label>
                <input
                  type="text"
                  placeholder="e.g. Authentic North Indian &amp; Mughlai Cuisine"
                  className="form-input"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description &amp; Culinary Story</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Describe your restaurant's heritage, specialty dishes, ambiance…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Cuisines (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. North Indian, Biryani, Mughlai"
                  className="form-input"
                  value={cuisineInput}
                  onChange={(e) => setCuisineInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Region / Area</label>
                <select
                  className="form-select"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="Bagalkote">Bagalkote</option>
                  <option value="Bengaluru Rural">Bengaluru Rural</option>
                  <option value="Bengaluru Urban">Bengaluru Urban</option>
                  <option value="Belagavi">Belagavi</option>
                  <option value="Ballari">Ballari</option>
                  <option value="Bidar">Bidar</option>
                  <option value="Chamarajanagar">Chamarajanagar</option>
                  <option value="Chikkaballapur">Chikkaballapur</option>
                  <option value="Chikkamagaluru">Chikkamagaluru</option>
                  <option value="Chitradurga">Chitradurga</option>
                  <option value="Dakshina Kannada">Dakshina Kannada</option>
                  <option value="Davanagere">Davanagere</option>
                  <option value="Dharwad">Dharwad</option>
                  <option value="Gadag">Gadag</option>
                  <option value="Hassan">Hassan</option>
                  <option value="Haveri">Haveri</option>
                  <option value="Kalaburagi">Kalaburagi</option>
                  <option value="Koppal">Koppal</option>
                  <option value="Kolar">Kolar</option>
                  <option value="Mandya">Mandya</option>
                  <option value="Mysuru">Mysuru</option>
                  <option value="Raichur">Raichur</option>
                  <option value="Ramanagara">Ramanagara</option>
                  <option value="Shivamogga">Shivamogga</option>
                  <option value="Tumakuru">Tumakuru</option>
                  <option value="Udupi">Udupi</option>
                  <option value="Uttara Kannada">Uttara Kannada</option>
                  <option value="Vijayapura">Vijayapura</option>
                  <option value="Yadgir">Yadgir</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  placeholder="owner@restaurant.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Cover Photo Upload */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={14} color="var(--primary)" /> Restaurant Cover Photo (JPG or PNG)
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px',
                background: 'var(--bg-surface)', border: '1px dashed var(--border-medium)', borderRadius: '12px',
              }}>
                <img
                  src={coverImagePreview || coverImage}
                  alt="Cover Preview"
                  style={{ width: '88px', height: '62px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                />
                <div style={{ flex: 1 }}>
                  <input type="file" ref={coverFileInputRef} accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    style={{ display: 'none' }} onChange={(e) => handleImageFile(e, 'cover')} />
                  <button type="button" onClick={() => coverFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm" disabled={uploadingCover} style={{ gap: '6px' }}>
                    <UploadCloud size={14} />
                    {uploadingCover ? 'Uploading…' : 'Upload Cover (JPG / PNG)'}
                  </button>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {coverFileName ? `📎 ${coverFileName}` : 'Select a JPG or PNG file from your device'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 2: Restaurant Bill Upload                     */}
          {/* ══════════════════════════════════════════════════════ */}
          <div id="reg-bill-section" style={{
            background: 'linear-gradient(135deg, rgba(255,90,54,0.05) 0%, rgba(255,179,0,0.03) 100%)',
            border: (billImage || billImagePreview) ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,90,54,0.4)',
            borderRadius: '14px', padding: '22px', marginBottom: '26px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,90,54,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={17} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                  2. Restaurant Bill / Receipt (JPG or PNG) *
                </h3>
              </div>
              <span className="badge" style={{
                background: (billImage || billImagePreview) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: (billImage || billImagePreview) ? '#10B981' : '#EF4444',
                border: `1px solid ${(billImage || billImagePreview) ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                fontSize: '0.72rem', fontWeight: 700
              }}>
                {(billImage || billImagePreview) ? '✓ BILL ATTACHED' : 'MANDATORY FOR VERIFICATION'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '16px', lineHeight: 1.55 }}>
              Upload an official printed bill or tax invoice from your restaurant. This verifies your listing and calibrates OCR receipt scanning for customer reviews. Formats: <strong>JPG, PNG</strong> (Max 10 MB). <strong>Mandatory for registration.</strong>
            </p>

            <input type="file" ref={billFileInputRef} accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              style={{ display: 'none' }} onChange={(e) => handleImageFile(e, 'bill')} />

            {billImagePreview ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={billImagePreview} alt="Bill Preview"
                    style={{ width: '62px', height: '62px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(16,185,129,0.4)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} color="#10B981" />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10B981' }}>Bill Attached (JPG/PNG)</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {billFileName} {billFileSize ? `• ${billFileSize}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => billFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>Change</button>
                  <button type="button" onClick={handleRemoveBill}
                    className="btn btn-ghost btn-sm" style={{ color: '#EF4444', fontSize: '0.8rem' }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => billFileInputRef.current?.click()}
                style={{
                  padding: '28px', background: 'var(--bg-surface)',
                  border: '2px dashed rgba(255,90,54,0.35)', borderRadius: '12px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,90,54,0.35)')}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255,90,54,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
                }}>
                  <UploadCloud size={22} color="var(--primary)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#FFF' }}>
                  {uploadingBill ? 'Uploading…' : 'Click to Upload Restaurant Bill (JPG or PNG)'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supported: <strong>.JPG .JPEG .PNG</strong> · Max 10 MB
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 3: Physical Address & Geofence (split fields)  */}
          {/* ══════════════════════════════════════════════════════ */}
          <div id="reg-location-section" style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: '14px', padding: '22px', marginBottom: '26px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <MapPin size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF' }}>
                3. Physical Address &amp; GPS Geofencing
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Customer reviews are verified against your restaurant's GPS coordinates. You can use your live device location, search for your restaurant's exact address/area, or select a city preset.
            </p>

            {/* Location Auto-Detect & Search Bar Box */}
            <div style={{
              background: locationGranted
                ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.05) 100%)'
                : 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,90,54,0.05) 100%)',
              border: `1px solid ${locationGranted ? 'rgba(16,185,129,0.35)' : 'rgba(59,130,246,0.25)'}`,
              borderRadius: '14px', padding: '18px', marginBottom: '18px',
            }}>
              {/* Top Banner: Status & Live GPS Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.94rem', color: '#FFF' }}>
                    <Navigation size={17} color={locationGranted ? '#10B981' : '#60A5FA'} />
                    {locationGranted ? '📍 Location Successfully Captured!' : 'Capture Location Automatically'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {locationGranted
                      ? `Resolved: ${city ? city + ', ' : ''}${state ? state + ', ' : ''}${country || ''} (Lat: ${lat}, Lng: ${lng}${accuracyMeters ? ` • ±${accuracyMeters}m` : ''})`
                      : 'Use your device GPS or search by restaurant address / landmark below.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={fetchingLocation}
                  className="btn btn-secondary btn-sm"
                  style={{
                    gap: '7px',
                    borderColor: locationGranted ? 'rgba(16,185,129,0.5)' : 'rgba(59,130,246,0.4)',
                    color: locationGranted ? '#10B981' : '#60A5FA',
                    background: locationGranted ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.08)',
                    fontWeight: 600,
                  }}
                >
                  {fetchingLocation
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Detecting GPS…</>
                    : <><LocateFixed size={14} /> {locationGranted ? 'Re-detect Device GPS' : 'Get My Live GPS Location'}</>
                  }
                </button>
              </div>

              {/* Search Location / Landmark Input */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  🔍 Or Search Restaurant Locality / Address / Landmark:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      placeholder="e.g. Koramangala 4th Block, Bengaluru or Gokulam, Mysuru..."
                      className="form-input"
                      value={searchLocationQuery}
                      onChange={(e) => setSearchLocationQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation(); } }}
                      style={{ paddingLeft: '34px', height: '40px', fontSize: '0.86rem' }}
                    />
                    <Search size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchLocation}
                    disabled={searchingLocation}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '40px', padding: '0 16px', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    {searchingLocation
                      ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Searching…</>
                      : <><Crosshair size={14} /> Search &amp; Locate</>
                    }
                  </button>
                </div>

                {/* Multiple search results dropdown */}
                {searchResults.length > 1 && (
                  <div style={{
                    marginTop: '10px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)',
                    borderRadius: '10px', padding: '8px', maxHeight: '180px', overflowY: 'auto',
                  }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', padding: '4px 8px', fontWeight: 700 }}>
                      SELECT YOUR EXACT LOCATION:
                    </div>
                    {searchResults.map((item, idx) => (
                      <div
                        key={item.place_id || idx}
                        onClick={() => applySearchResult(item)}
                        style={{
                          padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem',
                          color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,90,54,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <MapPin size={14} color="#FF5A36" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick City Presets */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700, marginRight: '4px' }}>
                  QUICK CITY PRESETS:
                </span>
                {PRESET_LOCATIONS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.74rem', padding: '4px 10px',
                      background: city === p.city ? 'rgba(255,90,54,0.18)' : 'rgba(255,255,255,0.04)',
                      borderColor: city === p.city ? 'var(--primary)' : 'var(--border-subtle)',
                      color: city === p.city ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split address fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Building / Plot No. *</label>
                <input
                  id="reg-building-no"
                  type="text"
                  required
                  placeholder="e.g. No. 12 / 4-B"
                  className="form-input"
                  value={buildingNo}
                  onChange={(e) => setBuildingNo(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Street / Road Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Feet Road, Indiranagar"
                  className="form-input"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
            </div>

            {/* Taluk, City, State, Country Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Taluk / Tehsil *</label>
                <input
                  id="reg-taluk"
                  type="text"
                  required
                  placeholder="e.g. Bengaluru North, Anekal, Mysuru"
                  className="form-input"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  style={{ fontWeight: 600, color: '#FFF' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">City / Town *</label>
                <input
                  id="reg-city"
                  type="text"
                  required
                  placeholder="e.g. Bengaluru, Mysuru, Chennai"
                  className="form-input"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setRegion(e.target.value);
                  }}
                  style={{ fontWeight: 600, color: '#FFF' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">State *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka"
                  className="form-input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Country *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. India"
                  className="form-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>

            {/* GPS Coordinates Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Latitude (GPS) *</span>
                  {lat && <span style={{ color: '#10B981', fontSize: '0.74rem' }}>✓ Coordinates locked</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 12.9716"
                  className="form-input"
                  value={lat}
                  onChange={(e) => { setLat(e.target.value); setLocationGranted(true); }}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Longitude (GPS) *</span>
                  {lng && <span style={{ color: '#10B981', fontSize: '0.74rem' }}>✓ Geofence ready</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 77.5946"
                  className="form-input"
                  value={lng}
                  onChange={(e) => { setLng(e.target.value); setLocationGranted(true); }}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>

            {/* Interactive Leaflet Map Location Picker */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <label className="form-label" style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#FFF',
                }}>
                  <MousePointerClick size={16} color="var(--primary)" />
                  Select Restaurant Location on Interactive Map:
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Click anywhere on the map to drop a pin &amp; click <strong>Set Location</strong>
                </span>
              </div>

              <div style={{
                position: 'relative',
                borderRadius: '14px',
                overflow: 'hidden',
                border: mapSelectedCoords ? '2px solid #FF5A36' : '1px solid var(--border-medium)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
                height: '280px',
                background: '#1E293B',
              }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

                {/* Floating "Set Location" Button Badge when a location is selected on map */}
                {mapSelectedCoords && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.94)',
                    border: '1px solid rgba(255, 90, 54, 0.6)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                        Point Selected:
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#FFF', fontWeight: 700, fontFamily: 'monospace' }}>
                        📍 {mapSelectedCoords.lat}, {mapSelectedCoords.lng}
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-set-map-location"
                      onClick={() => handleSetLocationFromMap(mapSelectedCoords.lat, mapSelectedCoords.lng)}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontWeight: 700,
                        gap: '6px',
                        background: 'linear-gradient(135deg, #FF5A36 0%, #FF8A00 100%)',
                        boxShadow: '0 2px 10px rgba(255,90,54,0.4)',
                        fontSize: '0.82rem',
                        padding: '6px 14px',
                      }}
                    >
                      <Check size={14} /> Set Location
                    </button>
                  </div>
                )}
              </div>

              {/* Below Map Info & Action Bar */}
              <div style={{
                marginTop: '8px',
                padding: '8px 14px',
                background: 'rgba(11,15,23,0.92)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color={locationGranted ? '#10B981' : '#FF5A36'} />
                  <span>
                    {mapSelectedCoords ? (
                      <>Selected on map: <strong style={{ color: '#FF8A00' }}>{mapSelectedCoords.lat}, {mapSelectedCoords.lng}</strong> (Click "Set Location" to lock and fill address)</>
                    ) : lat && lng ? (
                      <>Restaurant Pin: <strong style={{ color: '#FFF' }}>{lat}, {lng}</strong> ({taluk ? taluk + ', ' : ''}{city || 'Active'})</>
                    ) : (
                      'Click anywhere on the map to select your restaurant pin.'
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {mapSelectedCoords && (
                    <button
                      type="button"
                      onClick={() => handleSetLocationFromMap(mapSelectedCoords.lat, mapSelectedCoords.lng)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.76rem', padding: '3px 10px', height: '26px' }}
                    >
                      Set Location
                    </button>
                  )}
                  {lat && lng && (
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Google Maps <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Geofence slider */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Geofence Verification Radius</label>
                <span style={{ fontWeight: 800, color: '#10B981', fontSize: '0.88rem' }}>
                  {geofenceRadius} m
                </span>
              </div>
              <input type="range" min="50" max="500" step="25" value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.71rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                <span>50m – Table strict</span>
                <span>200m – Standard</span>
                <span>500m – Resort / Mall</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 4: Menu Builder – starts empty               */}
          {/* ══════════════════════════════════════════════════════ */}
          <div style={{ marginBottom: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF' }}>
                🍴 4. Menu Items
              </h3>
              {menuItems.length > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '0.73rem' }}>
                  {menuItems.length} dish{menuItems.length !== 1 ? 'es' : ''} added
                </span>
              )}
            </div>

            {/* Existing items */}
            {menuItems.length === 0 ? (
              <div style={{
                padding: '24px', textAlign: 'center',
                background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', borderRadius: '12px',
                color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px',
              }}>
                🍽️ No dishes added yet. Use the form below to build your menu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {menuItems.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', padding: '12px 16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.93rem', color: '#FFF' }}>{item.name}</span>
                        <span className="badge" style={{
                          background: item.category === 'Mains' ? 'rgba(255,90,54,0.15)' : 'rgba(255,255,255,0.07)',
                          color: item.category === 'Mains' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.69rem',
                        }}>{item.category}</span>
                        <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.9rem' }}>₹{item.price}</span>
                      </div>
                      {item.description && (
                        <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => handleRemoveMenuItem(item.id)}
                      className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new dish row */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-medium)',
              borderRadius: '12px', padding: '16px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-muted)' }}>
                Add a Dish
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input type="text" placeholder="Dish Name (e.g. Butter Chicken)" className="form-input"
                  value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                <input type="number" placeholder="Price (₹)" className="form-input"
                  value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                <select className="form-select" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}>
                  <option value="Mains">Mains</option>
                  <option value="Starters">Starters / Tandoori</option>
                  <option value="Breads & Sides">Breads &amp; Sides</option>
                  <option value="Desserts">Desserts (Mithai)</option>
                  <option value="Drinks">Drinks (Lassi / Chai)</option>
                  <option value="Specials">Chef Specials</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <input type="text" placeholder="Optional description / ingredients…" className="form-input"
                  value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} />
                <button type="button" onClick={handleAddMenuItem}
                  className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', gap: '6px' }}>
                  <Plus size={14} /> Add Dish
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {submitting ? 'Registering Restaurant…' : '🚀 Submit Restaurant for Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}

const sectionTitle = {
  fontSize: '1.05rem',
  fontWeight: 700,
  marginBottom: '16px',
  color: '#FFF',
};
