import type { Player } from "../../../../../core/playermanager";
import Plugin from "../../../../../core/plugins";
import Widget from "../../../../../core/ui/widget";
import { escape, formatTime } from "../../../../../core/utils";
import MMMPoints from "../../../../schemas/mmmpoints.model";

export default class RecordsWidget extends Plugin {
    static depends: string[] = ["records"];
    widgets: { [key: string]: Widget } = {};
    records: any[] = [];

    async onLoad() {
        tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
        tmc.server.addListener("Plugin.Records.onSync", this.onSync, this);
        tmc.server.addListener("Plugin.Records.onRefresh", this.onSync, this);
        tmc.server.addListener("Plugin.Records.onUpdateRecord", this.onUpdateRecord, this);
        tmc.server.addListener("Plugin.Records.onNewRecord", this.onNewRecord, this);
    }

    async onPlayerConnect(player: Player) {
        const login = player.login;
        await this.updateWidget(login);
        if (this.widgets[login]) {
            await tmc.ui.displayManialink(this.widgets[login]);
        }
    }

    async onPlayerDisconnect(player: Player) {
        const login = player.login;
        if (this.widgets[login]) {
            delete this.widgets[login];
        }
    }

    async onUnload() {
        for (const login of Object.keys(this.widgets)) {
            delete this.widgets[login];
        }
    }

    async onSync(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async onNewRecord(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async onUpdateRecord(data: any) {
        this.records = data.records;
        await this.updateWidgets();
    }

    async updateWidgets() {
        for (const player of tmc.players.getAll()) {
            await this.updateWidget(player.login);
        }
        await tmc.ui.displayManialinks(Object.values(this.widgets));
    }

    async updateWidget(login: string) {
        let widget = this.widgets[login];
        if (!widget) {
            widget = new Widget("userdata/plugins/mmmleaderboard/widgets/records/widget.twig");
            widget.title = "Records";
            widget.recipient = login;
            widget.pos = { x: 105, y: 30 };
            widget.size = { width: 55, height: 45 };
            widget.setOpenAction(this.widgetClick.bind(this));
        }

        let outRecords = this.records.slice(0, 5);
        let myIndex = this.records.findIndex((val: any) => val.login == login);

        let addRecords = true;
        if (myIndex !== -1) {
            if (myIndex >= 10) {
                addRecords = false;
                outRecords = [...outRecords, ...this.records.slice(myIndex - 3, myIndex + 2)];
            }
        }
        if (addRecords) {
            outRecords = [...outRecords, ...this.records.slice(5, 10)];
        }

        for (const rec of outRecords) {
            rec.formattedTime = formatTime(rec.time);
            rec.nickname = escape(rec.player.nickname);
            let points = await MMMPoints.findOne({ where: { login: rec.login, mapUid: tmc.maps.currentMap?.UId } });
            rec.points = points ? points.points : 0;
        }

        widget.setData({ records: outRecords });
        widget.size = { width: 55, height: 4 * outRecords.length + 1 };

        this.widgets[login] = widget;
    }

    async widgetClick(login: string, data: any) {
        await tmc.chatCmd.execute(login, "/points");
    }
}
