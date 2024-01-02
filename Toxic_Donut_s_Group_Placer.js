ScriptAPI.register('Toxic Donuts Group Placer', true, 'Toxic-Donut', 'nl.tribalwars@coma.innogames.de');

(async () => {
    if (typeof window.twLib === 'undefined') {
        window.twLib = {
            queues: null,
            init: function () {
                if (this.queues === null) {
                    this.queues = this.queueLib.createQueues(5);
                }
            },
            queueLib: {
                maxAttempts: 3,
                Item: function (action, arg, promise = null) {
                    this.action = action;
                    this.arguments = arg;
                    this.promise = promise;
                    this.attempts = 0;
                },
                Queue: function () {
                    this.list = [];
                    this.working = false;
                    this.length = 0;

                    this.doNext = function () {
                        let item = this.dequeue();
                        let self = this;

                        if (item.action === 'openWindow') {
                            window.open(...item.arguments).addEventListener('DOMContentLoaded', function () {
                                self.start();
                            });
                        } else {
                            $[item.action](...item.arguments).done(function () {
                                item.promise.resolve.apply(null, arguments);
                                self.start();
                            }).fail(function () {
                                item.attempts += 1;
                                if (item.attempts < twLib.queueLib.maxAttempts) {
                                    self.enqueue(item, true);
                                } else {
                                    item.promise.reject.apply(null, arguments);
                                }

                                self.start();
                            });
                        }
                    };

                    this.start = function () {
                        if (this.length) {
                            this.working = true;
                            this.doNext();
                        } else {
                            this.working = false;
                        }
                    };

                    this.dequeue = function () {
                        this.length -= 1;
                        return this.list.shift();
                    };

                    this.enqueue = function (item, front = false) {
                        (front) ? this.list.unshift(item) : this.list.push(item);
                        this.length += 1;

                        if (!this.working) {
                            this.start();
                        }
                    };
                },
                createQueues: function (amount) {
                    let arr = [];

                    for (let i = 0; i < amount; i++) {
                        arr[i] = new twLib.queueLib.Queue();
                    }

                    return arr;
                },
                addItem: function (item) {
                    let leastBusyQueue = twLib.queues.map(q => q.length).reduce((next, curr) => (curr < next) ? curr : next, 0);
                    twLib.queues[leastBusyQueue].enqueue(item);
                },
                orchestrator: function (type, arg) {
                    let promise = $.Deferred();
                    let item = new twLib.queueLib.Item(type, arg, promise);

                    twLib.queueLib.addItem(item);

                    return promise;
                }
            },
            ajax: function () {
                return twLib.queueLib.orchestrator('ajax', arguments);
            },
            get: function () {
                return twLib.queueLib.orchestrator('get', arguments);
            },
            post: function () {
                return twLib.queueLib.orchestrator('post', arguments);
            },
            openWindow: function () {
                let item = new twLib.queueLib.Item('openWindow', arguments);

                twLib.queueLib.addItem(item);
            }
        };

        twLib.init();
    }

    // Needed functions
    if (!Array.prototype.findE) {
        Array.prototype.findE = function (index) {
            return this[index];
        };
    }
    const locale = game_data.locale;
    const lang = {
        'nl_NL':
            {
                'coords': (amount) => `Coördinaten${amount > 0 ? ` (${amount})` : ''}`,
                'coordErrorTitle': 'Niet bestaande coördinaten',
                'add': 'Invoeren',
                'remove': 'Weghalen',
                'insertErrorTitle': 'Je moet coördinaten invoeren alvorens je dorpen kan toevoegen aan deze groep!',
                'insertSuccessful': (name, coords, groupName) => `${name} van ${coords.length} coördinaten in ${groupName} is voltooid.`,
                'add_to_group': (coords, group) => `Ben je zeker dat je ${coords.length} dorpen wil toevoegen aan ${group}?`,
                'remove_from_group': (coords, group) => `Ben je zeker dat je ${coords.length} dorpen wil verwijderen uit ${group}?`,
                'removeAllTitle': 'Je hebt geen coördinaten ingegeven, wil je alle dorpen uit deze groep wissen?',
                'updateGroupSuccess': (amountOfVillages, groupName) => `${amountOfVillages} dorpen uit ${groupName} zijn succesvol verwijdert.`,
                'updateGroupError': 'Er is iets verkeerd gelopen bij het aanpassen van je groep, probeer het opnieuw.',
                'yes': 'Ja',
                'no': 'Nee',
            },
        'en_DK': {
            'coords': (amount) => `Coordinate${amount > 0 ? ` (${amount})` : ''}`,
            'coordErrorTitle': 'Non-existent coordinates\n',
            'add': 'Add',
            'remove': 'Remove',
            'insertErrorTitle': 'You must enter coordinates before you can add villages to this group\n!',
            'insertSuccessful': (name, coords, groupName) => `${name} from ${coords.length} coordinates in ${groupName} is finished.`,
            'add_to_group': (coords, group) => `Are you sure you want to add ${coords.length} villages to ${group}?`,
            'remove_from_group': (coords, group) => `Are you sure you want to remove ${coords.length} villages from ${group}?`,
            'removeAllTitle': 'You have not entered any coordinates, do you want to delete all villages from this group\n?',
            'updateGroupSuccess': (amountOfVillages, groupName) => `${amountOfVillages} villages from ${groupName} have been successfully deleted.`,
            'updateGroupError': 'Something went wrong while editing your group, please try again\n.',
            'yes': 'Yes',
            'no': 'No',
        }
    };

    const langToUse = lang[locale].length > 0 ? lang[locale] : lang['en_DK'];

    const getOwnVillages = async (groupId) => await twLib.post(`${game_data.link_base_pure}groups&ajax=load_villages_from_group`, {
        h: game_data.csrf,
        group_id: groupId ?? 0
    }).then(result => $('#group_table:last tr', result['html']).get().reduce((el, village) => ({
        ...el,
        [$('td:last', village).text().trim()]: Number($('td:first a', village).data('village-id'))
    }), {}));

    const updateGroups = (data) => new Promise(async resolve => {
        await twLib.post(`${game_data.link_base_pure}overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial`, data)
            .then(resolve).catch(() => UI.ErrorMessage(langToUse['updateGroupError']));
    });

    const allOwnVillages = Object.keys(await getOwnVillages());
    const {result} = await twLib.get(`${game_data.link_base_pure}groups&mode=overview&ajax=load_group_menu&`);
    const getGroupOptions = () => (`${result.filter(el => el.group_id !== '0' && el.type === 'group_static').map((el) => `<option value="${el.group_id}">${el.name ?? ''}</option>`).join('')}`);
    const coordRegex = /\d{1,3}\|\d{1,3}/g;
    const villageListKey = `ToxicDonuts_villagesList_${game_data.world}`;
    const lastUploadDate = parseInt(localStorage.getItem(`${villageListKey}_lastUploadVillageData`));

    const LZString = function () {
        var r = String.fromCharCode;

        var i = {
            compressToUTF16: function (o) {
                return null == o ? '' : i._compress(o, 15, function (o) {
                    return r(o + 32);
                }) + ' ';
            }, decompressFromUTF16: function (r) {
                return null == r ? '' : '' == r ? null : i._decompress(r.length, 16384, function (o) {
                    return r.charCodeAt(o) - 32;
                });
            }, compress: function (o) {
                return i._compress(o, 16, function (o) {
                    return r(o);
                });
            }, _compress: function (r, o, n) {
                if (null == r) return '';
                var e, t, i, s = {}, u = {}, a = '', p = '', c = '', l = 2, f = 3, h = 2, d = [], m = 0, v = 0;
                for (i = 0; i < r.length; i += 1) if (a = r.charAt(i), Object.prototype.hasOwnProperty.call(s, a) || (s[a] = f++, u[a] = !0), p = c + a, Object.prototype.hasOwnProperty.call(s, p)) c = p; else {
                    if (Object.prototype.hasOwnProperty.call(u, c)) {
                        if (c.charCodeAt(0) < 256) {
                            for (e = 0; e < h; e++) m <<= 1, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++;
                            for (t = c.charCodeAt(0), e = 0; e < 8; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        } else {
                            for (t = 1, e = 0; e < h; e++) m = m << 1 | t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0;
                            for (t = c.charCodeAt(0), e = 0; e < 16; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        }
                        0 == --l && (l = Math.pow(2, h), h++), delete u[c];
                    } else for (t = s[c], e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                    0 == --l && (l = Math.pow(2, h), h++), s[p] = f++, c = String(a);
                }
                if ('' !== c) {
                    if (Object.prototype.hasOwnProperty.call(u, c)) {
                        if (c.charCodeAt(0) < 256) {
                            for (e = 0; e < h; e++) m <<= 1, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++;
                            for (t = c.charCodeAt(0), e = 0; e < 8; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        } else {
                            for (t = 1, e = 0; e < h; e++) m = m << 1 | t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0;
                            for (t = c.charCodeAt(0), e = 0; e < 16; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                        }
                        0 == --l && (l = Math.pow(2, h), h++), delete u[c];
                    } else for (t = s[c], e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                    0 == --l && (l = Math.pow(2, h), h++);
                }
                for (t = 2, e = 0; e < h; e++) m = m << 1 | 1 & t, v == o - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1;
                for (; ;) {
                    if (m <<= 1, v == o - 1) {
                        d.push(n(m));
                        break;
                    }
                    v++;
                }
                return d.join('');
            }, _decompress: function (o, n, e) {
                var t, i, s, u, a, p, c, l = [], f = 4, h = 4, d = 3, m = '', v = [],
                    g = {val: e(0), position: n, index: 1};
                for (t = 0; t < 3; t += 1) l[t] = t;
                for (s = 0, a = Math.pow(2, 2), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                switch (s) {
                    case 0:
                        for (s = 0, a = Math.pow(2, 8), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                        c = r(s);
                        break;
                    case 1:
                        for (s = 0, a = Math.pow(2, 16), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                        c = r(s);
                        break;
                    case 2:
                        return '';
                }
                for (l[3] = c, i = c, v.push(c); ;) {
                    if (g.index > o) return '';
                    for (s = 0, a = Math.pow(2, d), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                    switch (c = s) {
                        case 0:
                            for (s = 0, a = Math.pow(2, 8), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                            l[h++] = r(s), c = h - 1, f--;
                            break;
                        case 1:
                            for (s = 0, a = Math.pow(2, 16), p = 1; p != a;) u = g.val & g.position, g.position >>= 1, 0 == g.position && (g.position = n, g.val = e(g.index++)), s |= (u > 0 ? 1 : 0) * p, p <<= 1;
                            l[h++] = r(s), c = h - 1, f--;
                            break;
                        case 2:
                            return v.join('');
                    }
                    if (0 == f && (f = Math.pow(2, d), d++), l[c]) m = l[c]; else {
                        if (c !== h) return null;
                        m = i + i.charAt(0);
                    }
                    v.push(m), l[h++] = i + m.charAt(0), i = m, 0 == --f && (f = Math.pow(2, d), d++);
                }
            }
        };
        return i;
    }();

    // Village data from world database //
    const loadVillageData = (type) => new Promise(async resolve => {
        if (villageListKey in localStorage && type !== 'update') {
            const localstorageString = localStorage.getItem(villageListKey);
            resolve(JSON.parse(LZString.decompressFromUTF16(localstorageString)));
        } else if (lastUploadDate + 60 * 60 * 1000 > Timing.getCurrentServerTime()) {
            return UI.ErrorMessage('You can only load village data once every hour.');
        } else {
            let villageOverviewList = {};
            await twLib.ajax({
                url: location.origin + '/map/village.txt', async: true, success: function (villages) {
                    villages.match(/[^\r\n]+/g).forEach(villageData => {
                        const splitVillageData = villageData.split(',');
                        const coordinates = splitVillageData[2] + "|" + splitVillageData[3];
                        villageOverviewList[coordinates] = {
                            id: splitVillageData[0], player_id: splitVillageData[4]
                        };
                    });
                    localStorage.setItem(villageListKey, LZString.compressToUTF16(JSON.stringify(villageOverviewList)));
                    localStorage.setItem(`${villageListKey}_lastUploadVillageData`, Timing.getCurrentServerTime());
                    UI.SuccessMessage(`Successfully stored ${Object.keys(villageOverviewList).length} villages for TW world: ${game_data.world} to localstorage`);
                }
            });
            resolve(villageOverviewList);
        }
    });

    let storedVillageList = await loadVillageData();
    let updated = false;

    const getVillageId = (coord) => new Promise((resolve, reject) => {
        if (coord in storedVillageList) {
            resolve(storedVillageList[coord].id);
        } else if (updated || lastUploadDate + 60 * 60 * 1000 > Timing.getCurrentServerTime()) {
            resolve(undefined);
        } else {
            loadVillageData('update').then(result => {
                updated = true;
                storedVillageList = result;
                resolve(result[coord]?.id);
            });
        }
    });


    Dialog.show('toxicDonutsGroupPlacer', `
    <table class="vis">
        <tbody>
            <tr>
                <th style="text-align: center" class="coordTitle">${langToUse['coords']()}</th>
            </tr><tr>
                <td>
                    <textarea rows="10" cols="50" id="coordsArea"></textarea>
                </td>
            </tr><tr>
                <th class="errorArea" style="display: none; text-align: center">${langToUse['coordErrorTitle']}</th>
            </tr><tr>
                <td>
                    <textarea rows="10" cols="50" class="errorArea" style="display: none"></textarea>
                </td>
            </tr><tr>
                <td style="text-align: right">
                    <select>${getGroupOptions()}</select>
                    <input style="display: none" type="button" class="btn adjustGroups" value="${langToUse['add']}" data-type="add_to_group">
                    <input type="button" class="btn adjustGroups" value="${langToUse['remove']}" data-type="remove_from_group">
                </td>
            </tr>
        </tbody>
   </table>`);

    $('#coordsArea').on('input', () => {
        const coordAmount = [...new Set($('#coordsArea').val()?.match(coordRegex))].length;
        $('.coordTitle').text(langToUse['coords'](coordAmount));
        const button = $('.adjustGroups[data-type="add_to_group"]');
        coordAmount > 0 ? $(button).show() : $(button).hide();
    });

    $('.adjustGroups').on('click', async ({target}) => {
        const coords = $('#coordsArea').val()?.match(coordRegex)?.filter(coord => allOwnVillages.includes(coord)) ?? UI.ErrorMessage(langToUse['insertErrorTitle']);
        const type = $(target).data('type');
        const name = $(target).val();
        const groupId = $(target).closest('tr').find('select option:selected').val();
        const groupName = $(target).closest('tr').find('select option:selected').text();

        UI.ErrorMessage(`
                <li>${coords ? langToUse[type](coords, groupName) : langToUse['removeAllTitle']}</li>
                <p>
                    <button style="width: 40px" class="btn answerYes">${langToUse['yes']}</button>
                    <button style="width: 40px" class="btn">${langToUse['no']}</button>
                </p>`, 100000);

        $('.answerYes').on('click', async () => {
            if (coords) {
                const uniqueCoords = [...new Set(coords)];

                let data = `${type}=${name}&selected_group=${groupId}&h=${game_data.csrf}`;
                let errorCoords = [];

                for (const coord of uniqueCoords) {
                    await getVillageId(coord).then(villageId => {
                        if (villageId) data += `&village_ids%5B%5D=${villageId}`;
                        else errorCoords.push(coord);
                    });
                }

                updateGroups(data).then(() => {
                    if (!errorCoords.length) {
                        $('.errorArea').hide();
                        UI.SuccessMessage(langToUse['insertSuccessful'](name, uniqueCoords, groupName));
                    } else {
                        $('.errorArea').show().val(errorCoords.join('\n'));
                        UI.ErrorMessage(`${name} from ${errorCoords.length} coords into ${groupName} has failed due to the coords not being found in the village list.`);
                    }
                });
            } else {
                if (type.includes('remove')) {
                    const groupVillages = await getOwnVillages(groupId);
                    let data = `${type}=${name}&selected_group=${groupId}&h=${game_data.csrf}`;

                    Object.values(groupVillages).forEach(villageId => data += `&village_ids%5B%5D=${villageId}`);

                    updateGroups(data).then(() => UI.SuccessMessage(langToUse['updateGroupSuccess'](Object.keys(groupVillages).length, groupName)));
                }
            }
        });
    });
})();