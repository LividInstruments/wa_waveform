wa_waveform
===========

A simple example of a Waveform UI for webaudio buffer.

The waveform is drawn to a hidden canvas, then copied to the UI canvas for display. This makes redrawing faster when interacting with the selection handles.
Simple zoom-in on selection and zoom-out to select all is implemented.

To do:
* keep selection on zoom-out
* add padding to selection to allow expanding selection when zoomed in
* make modular for easier integration with other code

by Peter Nyboer
