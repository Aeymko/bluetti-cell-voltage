# Bluetti Cell Voltage

Per-cell battery voltages of BLUETTI power stations, read straight from the browser over Bluetooth.

**[Open the app →](https://aeymko.github.io/bluetti-cell-voltage/)**

- Live cell voltages, delta, SOC and charging mode
- Charts of each cell, the delta and SOC over time
- Saved readings stay in your browser; export to CSV or JSON
- Read-only: nothing is ever written to the station

## Requirements

- A browser with [Web Bluetooth](https://caniuse.com/web-bluetooth): Chrome or Edge on desktop, Chrome on Android. Firefox and iOS are not supported.
- **Linux:** enable `chrome://flags/#enable-experimental-web-platform-features` and restart Chrome.
- The station must be on and not connected to the BLUETTI app — it accepts one Bluetooth connection at a time.

## Supported models

Verified on the **AC70P**. Other models are detected automatically (both the older V1 and the encrypted V2 protocol), but their cell readings are unverified.

To help add your model, connect it, click **Diagnostics → Dump registers** and attach the JSON file to a [new issue](https://github.com/Aeymko/bluetti-cell-voltage/issues/new). The serial number is removed from the dump.

## Development

```sh
npm ci
npm run dev    # http://localhost:8765
npm test
npm run lint
npm run build
```

Vue 3, shadcn-vue, Tailwind CSS and ECharts, organised by [Feature-Sliced Design](https://feature-sliced.design).

## Credits

The Bluetooth handshake is ported from [bluetti-bt-lib](https://github.com/Patrick762/bluetti-bt-lib) by Patrick762.

## License

[MIT](LICENSE). Not affiliated with BLUETTI.
