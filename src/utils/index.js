import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';
import assToVtt from './assToVtt';

momentDurationFormatSetup(moment);

export function checkTime(time) {
    return /^(\d+):([0-5][0-9]):([0-5][0-9])\.\d{3}$/.test(time);
}

export function checkDuration(duration) {
    return /^\d+\.\d{3}/.test(duration);
}

export function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function secondToTime(seconds) {
    const duration = moment.duration(seconds, 'seconds');
    return duration.format('hh:mm:ss.SSS', {
        trim: false,
    });
}

export function timeToSecond(time) {
    return moment.duration(time).asSeconds();
}

export function debounce(func, wait, context) {
    let timeout;
    return function fn(...args) {
        const later = function later() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function notice(text, success) {
    const $el = document.createElement('div');
    $el.innerText = text;
    $el.classList.add('notice');
    if (success) {
        $el.classList.add('success');
    }
    document.body.appendChild($el);
    setTimeout(() => {
        document.body.removeChild($el);
    }, 3000);
}

export function urlToArr(url) {
    return new Promise(resolve => {
        const $video = document.createElement('video');
        const $track = document.createElement('track');
        $track.default = true;
        $track.kind = 'metadata';
        $video.appendChild($track);
        $track.onload = () => {
            const arr = Array.from($track.track.cues).map((item, index) => {
                return {
                    $edit: false,
                    $highlight: false,
                    id: index,
                    start: secondToTime(item.startTime),
                    end: secondToTime(item.endTime),
                    text: item.text,
                    get startTime() {
                        return timeToSecond(this.start);
                    },
                    get endTime() {
                        return timeToSecond(this.end);
                    },
                    get duration() {
                        return (this.endTime - this.startTime).toFixed(3);
                    },
                };
            });
            resolve(arr);
        };
        $track.src = url;
    });
}

export function vttToUrl(vttText) {
    return URL.createObjectURL(
        new Blob([vttText], {
            type: 'text/vtt',
        }),
    );
}

export function arrToVtt(arr) {
    return (
        'WEBVTT\n\n' +
        arr
            .map((item, index) => {
                return (
                    index + 1 + '\n' + secondToTime(item.start) + ' --> ' + secondToTime(item.end) + '\n' + item.text
                );
            })
            .join('\n\n')
    );
}

export function srtToVtt(srtText) {
    return 'WEBVTT \r\n\r\n'.concat(
        srtText
            .replace(/\{\\([ibu])\}/g, '</$1>')
            .replace(/\{\\([ibu])1\}/g, '<$1>')
            .replace(/\{([ibu])\}/g, '<$1>')
            .replace(/\{\/([ibu])\}/g, '</$1>')
            .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
            .concat('\r\n\r\n'),
    );
}

export function readSubtitleFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const type = file.name
            .split('.')
            .pop()
            .toLowerCase();
        reader.onload = () => {
            if (type === 'srt') {
                resolve(srtToVtt(reader.result));
            } else if (type === 'ass') {
                resolve(assToVtt(reader.result));
            } else {
                resolve(reader.result);
            }
        };
        reader.onerror = error => {
            reject(error);
        };
        reader.readAsText(file);
    });
}

export function readSubtitleFromUrl(url) {
    let type;
    return fetch(url)
        .then(response => {
            type = response.headers.get('Content-Type');
            return response.text();
        })
        .then(text => {
            if (/x-subrip/gi.test(type)) {
                return srtToVtt(text);
            }
            return text;
        })
        .catch(error => {
            notice(error.message);
            throw error;
        });
}

export function downloadFile(url, name) {
    const elink = document.createElement('a');
    elink.style.display = 'none';
    elink.href = url;
    elink.download = name;
    document.body.appendChild(elink);
    elink.click();
    document.body.removeChild(elink);
}
