var connected = false;

/* Manage cases currencies having 3 letters or more */
function getBaseCurrency(pair) {
    if (pair.startsWith('DASH')) {
        return pair.substr(4, 3);
    } else if (pair.startsWith('GNO') || pair.startsWith('BCH')|| pair.startsWith('EOS')) {
        return pair.substr(3,3);
    } else {
        return pair.substr(5, 4);
    }
}

function getQuoteCurrency(pair) {
    if (pair.startsWith('DASH')) {
        return pair.substr(0, 4);
    } else if (pair.startsWith('GNO') || pair.startsWith('BCH')|| pair.startsWith('EOS')) {
        return pair.substr(0,3);
    } else {
        return pair.substr(1, 3);
    }
}

/* Split URL to get current selected exchange and currency */
var urlParts = window.location.href.split("/").filter(function(n){ return n !== "" });
var exchange = urlParts[urlParts.length - 2];
var pair = urlParts[urlParts.length - 1];
var pairParts = [];

if(exchange === "poloniex" || exchange === "cryptopia") {
    pairParts = pair.split('_');
}

if(exchange === "bittrex") {
    pairParts = pair.split('-');
}

if(exchange === "kraken") {
    pairParts = [getBaseCurrency(pair), getQuoteCurrency(pair)];
}

/* Manage incoming ws messages and sort it to the view (listener.html) */
function processMessage(event) {

    var input = JSON.parse(event.data);
    console.log(input);

    if(input.exchange !== exchange || input.pair !== pair) {
        return;
    }

    if(input.event !== 'gunbot' && input.event !== 'check_license') {
        console.log(input);
    }

    if(input.error !== false) {
        $("." + input.exchange + "." + input.pair + ".messages_list").prepend("<li class='error-message'>" + input.error + "</li>");
    }

    switch (input.event) {
        case 'getting_balances':
            var dataElement1 = input.data[pairParts[0]];
            dataElement1.header = pairParts[0];

            var dataElement2 = input.data[pairParts[1]];
            dataElement2.header = pairParts[1];

            var formattedData = [dataElement1, dataElement2];

            $('table.getting_balances.' + input.exchange + "." + input.pair).dynatable({
                features: {
                    paginate: false,
                    sort: false,
                    pushState: false,
                    search: false,
                    recordCount: false,
                    perPageSelect: false
                },
                dataset: {
                    records: formattedData
                }

            });

            break;

        case 'gettting_trade_history':
            $('table.' + input.event + '.' + input.exchange + "." + input.pair).dynatable({
                dataset: {
                    records: input.data
                }
            });

            break;

        case 'getting_open_orders':
            $('table.' + input.event + '.' + input.exchange + "." + input.pair).dynatable({
                features: {
                    paginate: false,
                    sort: false,
                    pushState: false,
                    search: false,
                    recordCount: false,
                    perPageSelect: false
                },
                dataset: {
                    records: input.data
                }
            });

            break;

        case 'getting_order_book':
        case 'getting_public_trade_history':
        case 'getting_ta':
        case 'sell_trade':
        case 'sell_trailing_stop':
        case 'getting_ema_1':
        case 'getting_ema_2':
        case 'buy_trade':
            for (var k in input.data) {
                if (input.data.hasOwnProperty(k)) {
                    $("." + input.exchange + "." + input.pair + "." + input.event + "." + k).text(toFixedTrunc(input.data[k], 10));
                }
            }

            break;

        case 'message':
            var message = input.data;
            $("." + input.exchange + "." + input.pair + ".messages_list").prepend("<li>" + message + "</li>");
    }
}

function toFixedTrunc(value, n) {
    if (value != 0) {
        if(/\d+\.?\d*e[\+\-]*\d+/i.test(value)) {
            let zero = '0',
            parts = String(value).toLowerCase().split('e'),
            e = parts.pop(),
            l = Math.abs(e),
            sign = e/l,
            coeff_array = parts[0].split('.');

            if(sign === -1) {
                value = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
            }
            else {
                let dec = coeff_array[1];
                if(dec) l = l - dec.length;
                value = coeff_array.join('') + new Array(l+1).join(zero);
            }
        }

        let v = value.toString().split('.');
        if (n <= 0) return v[0];

        if (v[1].length > n) {
            let f = v[1] || '';
            if (f.length > n) return `${v[0]}.${f.substr(0, n)}`;
            while (f.length < n) f += '0';
            return `${v[0]}.${f}`;
        } else {
            return value;
        }
    }

    return value;
}

var gbStatus;

/* Loop to receive incoming data from gunbot */
setInterval(()=>{
    $.ajax({
        type: "PUT",
        contentType: "application/json",
        url: '/gbstatus',
        success: function(data) {
            gbStatus = data;
        }
    });

    if (gbStatus) {
        if (connected)
            return false;

        var socket = new WebSocket("wss://"+config.hostname+":"+config.port+"/?gui=native");
        console.log("websocket connection with gunbot granted");
        connected = true;

        socket.onmessage = processMessage;
        socket.onerror = function (event) {
            connected = false;
            console.log(event);
        };

        // Dummy data

        // $('table.getting_open_orders').dynatable({
        //     dataset: {
        //         records: [{"orderNumber":"120466","type":"sell","rate":"0.025","amount":"100","total":"2.5"},{"orderNumber":"120467","type":"sell","rate":"0.04","amount":"100","total":"4"} ]
        //     }
        // });
    }
}, 1000);
