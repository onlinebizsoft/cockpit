/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2018 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, UtilizationBar } from 'patternfly-react';

import { ListingRow } from 'cockpit-components-listing.jsx';
import {
    convertToUnit,
    rephraseUI,
    storagePoolId,
    units
} from '../../helpers.js';
import { StoragePoolOverviewTab } from './storagePoolOverviewTab.jsx';
import { StoragePoolVolumesTab } from './storagePoolVolumesTab.jsx';
import { StoragePoolDelete } from './storagePoolDelete.jsx';
import { storagePoolActivate, storagePoolDeactivate } from '../../libvirt-dbus.js';

import cockpit from 'cockpit';

const _ = cockpit.gettext;

export class StoragePool extends React.Component {
    render() {
        const { storagePool, vms } = this.props;
        const idPrefix = `${storagePoolId(storagePool.name, storagePool.connectionName)}`;
        const name = (
            <span id={`${idPrefix}-name`}>
                { storagePool.name }
            </span>);
        const allocation = parseFloat(convertToUnit(storagePool.allocation, units.B, units.GiB).toFixed(2));
        const capacity = parseFloat(convertToUnit(storagePool.capacity, units.B, units.GiB).toFixed(2));
        const availableTooltipFunction = (max, now) => <Tooltip id='utilization-bar-tooltip-available'> Available {((max - now) / max).toFixed(2) * 100}% </Tooltip>;
        const usedTooltipFunction = (max, now) => <Tooltip id='utilization-bar-tooltip-used'> Used {(now / max).toFixed(2) * 100}% </Tooltip>;
        const size = (
            <React.Fragment>
                <UtilizationBar
                    now={allocation}
                    max={capacity}
                    availableTooltipFunction={availableTooltipFunction}
                    usedTooltipFunction={usedTooltipFunction}
                />
            </React.Fragment>
        );
        const sizeLabel = (
            <React.Fragment>
                {`${allocation} / ${capacity} GB`}
            </React.Fragment>
        );
        const state = (
            <React.Fragment>
                { this.props.resourceHasError[storagePool.id] ? <span className='pficon-warning-triangle-o machines-status-alert' /> : null }
                <span id={`${idPrefix}-state`}>
                    { storagePool.active ? _("active") : _("inactive") }
                </span>
            </React.Fragment>);
        const cols = [
            { name, 'header': true },
            size,
            sizeLabel,
            rephraseUI('connections', storagePool.connectionName),
            state,
        ];

        const overviewTabName = (
            <div id={`${idPrefix}-overview`}>
                {_("Overview")}
            </div>
        );
        const storageVolsTabName = (
            <div id={`${idPrefix}-storage-volumes`}>
                {_("Storage Volumes")}
            </div>
        );
        let tabRenderers = [
            {
                name: overviewTabName,
                renderer: StoragePoolOverviewTab,
                data: { storagePool }
            },
            {
                name: storageVolsTabName,
                renderer: StoragePoolVolumesTab,
                data: { storagePool, vms }
            },
        ];
        let extraClasses = [];

        if (this.props.resourceHasError[storagePool.id])
            extraClasses.push('error');

        return (
            <ListingRow rowId={idPrefix}
                extraClasses={extraClasses}
                columns={cols}
                tabRenderers={tabRenderers}
                listingActions={<StoragePoolActions onAddErrorNotification={this.props.onAddErrorNotification} storagePool={storagePool} />} />
        );
    }
}
StoragePool.propTypes = {
    onAddErrorNotification: PropTypes.func.isRequired,
    resourceHasError: PropTypes.object.resourceHasError,
    storagePool: PropTypes.object.isRequired,
    vms: PropTypes.array.isRequired,
};

class StoragePoolActions extends React.Component {
    constructor() {
        super();
        this.onActivate = this.onActivate.bind(this);
        this.onDeactivate = this.onDeactivate.bind(this);
    }

    onActivate() {
        const storagePool = this.props.storagePool;

        storagePoolActivate(storagePool.connectionName, storagePool.id)
                .fail(exc => {
                    this.props.onAddErrorNotification({
                        text: cockpit.format(_("Storage Pool $0 failed to get activated"), storagePool.name),
                        detail: exc.message, resourceId: storagePool.id,
                    });
                });
    }

    onDeactivate() {
        const storagePool = this.props.storagePool;

        storagePoolDeactivate(storagePool.connectionName, storagePool.id)
                .fail(exc => {
                    this.props.onAddErrorNotification({
                        text: cockpit.format(_("Storage Pool $0 failed to get deactivated"), storagePool.name),
                        detail: exc.message, resourceId: storagePool.id,
                    });
                });
    }

    render() {
        const { storagePool } = this.props;
        const id = storagePoolId(storagePool.name, storagePool.connectionName);

        return (
            <React.Fragment>
                { storagePool.active &&
                <Button id={`deactivate-${id}`} onClick={this.onDeactivate}>
                    {_("Deactivate")}
                </Button> }
                { !storagePool.active &&
                <Button id={`activate-${id}`} onClick={this.onActivate}>
                    {_("Activate")}
                </Button>
                }
                <StoragePoolDelete storagePool={storagePool} />
            </React.Fragment>
        );
    }
}
StoragePool.propTypes = {
    storagePool: PropTypes.object.isRequired,
    vms: PropTypes.array.isRequired,
    onAddErrorNotification: PropTypes.func.isRequired,
};
