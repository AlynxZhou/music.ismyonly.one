'use strict'

function ajax(url, callback) {
  let xhr = null;
  if (XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  } else if (ActiveXObject) {
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }
  if (xhr == null) {
    console.error("Your broswer does not support XMLHttpRequest!");
    return;
  }
  xhr.onreadystatechange = function () {
    // 4 is ready.
    if (xhr.readyState !== 4) {
      return;
    }
    if (xhr.status !== 200) {
      console.error("XMLHttpRequest failed!");
      return;
    }
    callback(xhr);
  };
  xhr.open("GET", url, true);
  xhr.send(null);
}

const base64Binary = {
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

	/* will return a  Uint8Array type */
	decodeArrayBuffer: function (input) {
		var bytes = (input.length/4) * 3;
		var ab = new ArrayBuffer(bytes);
		this.decode(input, ab);
		return ab;
	},

	removePaddingChars: function (input) {
		var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
		if (lkey === 64) {
			return input.substring(0,input.length - 1);
		}
		return input;
	},

	decode: function (input, arrayBuffer) {
		//get last chars to see if are valid
		input = this.removePaddingChars(input);
		input = this.removePaddingChars(input);

		var bytes = parseInt((input.length / 4) * 3, 10);

		var uarray;
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var j = 0;

		if (arrayBuffer) {
			uarray = new Uint8Array(arrayBuffer);
		} else {
			uarray = new Uint8Array(bytes);
		}

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		for (i = 0; i < bytes; i += 3) {
			//get the 3 octects in 4 ascii chars
			enc1 = this._keyStr.indexOf(input.charAt(j++));
			enc2 = this._keyStr.indexOf(input.charAt(j++));
			enc3 = this._keyStr.indexOf(input.charAt(j++));
			enc4 = this._keyStr.indexOf(input.charAt(j++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			uarray[i] = chr1;
			if (enc3 !== 64) {
				uarray[i+1] = chr2;
			}
			if (enc4 !== 64) {
				uarray[i+2] = chr3;
			}
		}

		return uarray;
	}
}

class TypeMusic {
  constructor(element, timbrePath, keymapPath) {
    this.context = new AudioContext()
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.context.destination)
    this.gainNode.gain.value = 1
		this.element = element
    this.timbre = {}
		this.keymap = {}
		this.sources = {}
    this.loadTimbre(timbrePath)
		this.loadKeymap(keymapPath)
  }
  loadTimbre(timbrePath) {
		ajax(timbrePath, (xhr) => {
			const json = JSON.parse(xhr.response)
			for (let pitch in json) {
				this.context.decodeAudioData(
					base64Binary.decodeArrayBuffer(
						json[pitch].replace("data:audio/ogg;base64,", "")
					), (audioBuffer) => {
						this.timbre[pitch] = audioBuffer
				})
			}
		})
  }
	loadKeymap(keymapPath) {
		ajax(keymapPath, (xhr) => {
			const json = JSON.parse(xhr.response)
			this.keymap = json
		})
	}
	onKeydown(event) {
		if (event.repeat || this.keymap[event.code] == null ||
			  this.sources[event.code] != null) {
			return
		}
		this.sources[event.code] = this.context.createBufferSource()
		this.sources[event.code].buffer = this.timbre[this.keymap[event.code]]
		this.sources[event.code].connect(this.gainNode)
		this.sources[event.code].start(this.context.currentTime)
	}
	onKeyup(event) {
		if (event.repeat || this.keymap[event.code] == null ||
			  this.sources[event.code] == null) {
			return
		}
		this.sources[event.code].stop(this.context.currentTime + 0.3)
		this.sources[event.code] = null
	}
	start() {
		this.element.addEventListener("keydown", this.onKeydown.bind(this))
		this.element.addEventListener("keyup", this.onKeyup.bind(this))
	}
	stop() {
		this.element.addEventListener("keydown", this.onKeydown.bind(this))
		this.element.addEventListener("keyup", this.onKeyup.bind(this))
	}
}
