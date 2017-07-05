sap.ui.define([
	'sap/m/MessageBox',
	'sap/ui/model/odata/ODataUtils',
	"sap/ui/core/mvc/Controller"
], function(MessageBox, ODataUtils, Controller) {
	"use strict";

	return Controller.extend("ch.bielHolidayPassCustomizing.controller.Main", {
		handleGetNextSAPDebitorNumber: function() {
			var that = this;
			this.getOwnerComponent().getModel('ZFP_SRV').callFunction("/getNextFPSAPDebitorNumber", {
				method: "GET",
				success: function(oData, response) {
					that.getView().getModel("BaseSettingUIModel").setProperty("/SapDebitorAct", oData.number);
				},
				error: function(oError) {
					MessageBox.error("Technisches Problem aufgetreten, bitte SAP CCC informieren.");
				},
				async: false
			});
		},
		onNewPartOfDay: function(oEvent) {
			this.getView().getModel("NewPartOfDay").setProperty("/", {
				id: "",
				text_d: "",
				text_f: ""
			});
			var oButton = oEvent.getSource();
			if (!this._oPopover_NewPartOfDay) {
				this._oPopover_NewPartOfDay = sap.ui.xmlfragment("ch.bielHolidayPassCustomizing.fragments.newPartOfDay", this);
				this.getView().addDependent(this._oPopover_NewPartOfDay);
			}

			// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
			jQuery.sap.delayedCall(0, this, function() {
				this._oPopover_NewPartOfDay.openBy(oButton);
			});

		},
		onDeletePrice: function(oEvent) {
			var that = this;
			var sPressedButton = oEvent.getParameter("id");
			var pos = sPressedButton.lastIndexOf("-");
			var index = sPressedButton.substring(pos + 1, sPressedButton.length);
			var oPriceToRemove = this.getView().getModel("PriceUI").getProperty("/" + index);
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');

			oModel.remove("/PricingSet('" + oPriceToRemove.Type + "')", {
				success: function(oData, response) {
					MessageBox.success("Erfolgreich entfernt");
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false
			});
			this.loadPriceData();

		},
		onCancelNewPartOfDay: function() {
			this._oPopover_NewPartOfDay.close();
		},
		onSavePartOfDay: function() {
			var aPartOfDayToUpdate = this.getOwnerComponent().getModel('control').getProperty("/part_of_day_to_update");
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			for (var i = 0; aPartOfDayToUpdate.length > i; i++) {

				var oPartOfDayToUpdate = oModel.getProperty(aPartOfDayToUpdate[i]);
				oModel.update(aPartOfDayToUpdate[i],
					oPartOfDayToUpdate, {
						success: function(oData, response) {
							MessageBox.success("Erfolgreich gesichert");
						},
						error: function(oError) {
							MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
						}
					});
			}
			this.getOwnerComponent().getModel('control').setProperty("/part_of_day_to_update", []);
			this.getView().byId("newPartOfDayButton").setVisible(true);
			this.getView().byId("editPartOfDayButton").setVisible(true);
			this.getView().byId("savePartOfDayButton").setVisible(false);
			this.getView().byId("cancelPartOfDayButton").setVisible(false);
			this.rebindTablePartOfDay(this.oReadOnlyTemplateTablePartOfDays);
		},
		onSaveNewPartOfDay: function() {

			var oNewPartOfDay = {
				Id: this.getView().getModel("NewPartOfDay").getProperty("/id"),
				TitleD: this.getView().getModel("NewPartOfDay").getProperty("/text_d"),
				TitleF: this.getView().getModel("NewPartOfDay").getProperty("/text_f")
			};

			this.getOwnerComponent().getModel('ZFP_SRV').create("/PartOfDaySet", oNewPartOfDay, {
				success: function(oData, response) {
					MessageBox.success("Erfolgreich gesichert");
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				}
			});

			this._oPopover_NewPartOfDay.close();
		},
		onDeletePeriod: function(oEvent) {
			var that = this;
			var sPressedButton = oEvent.getParameter("id");
			var pos = sPressedButton.lastIndexOf("-");
			var index = sPressedButton.substring(pos + 1, sPressedButton.length);
			var oPeriodToRemove = this.getView().getModel("PeriodsUI").getProperty("/" + index);
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');

			oModel.remove("/HolidayPassPeriodSet(Id='" + oPeriodToRemove.Id + "',Startdate=" + ODataUtils.formatValue(oPeriodToRemove.Startdate,
					"Edm.DateTime") +
				",Enddate=" + ODataUtils.formatValue(oPeriodToRemove.Enddate, "Edm.DateTime") + ")", {
					success: function(oData, response) {
						that.loadPeriodData();
						MessageBox.success("Erfolgreich entfernt");
					},
					error: function(oError) {
						MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
					}
				});
		},
		onSelectTab: function(oEvent) {
			var key = oEvent.getParameter("key");
			switch (key) {
				case "periods":
					this.loadPeriodData();
					break;
				case "prices":
					this.loadPriceData();
					break;
				case "baseSetting":
					this.loadBaseSetting();
					break;
			    case "billingPeriod":
			    	this.getOwnerComponent().getModel("ZFP_SRV").refresh(true);
			    break;
			}

		},
		onSave: function(oEvent) {
			var id = oEvent.getParameters().id;
			var pos = id.lastIndexOf("--");
			id = id.substring(pos + 2, id.length);
			switch (id) {
				case "onSavePeriods":
					var oModelBackEnd = this.getOwnerComponent().getModel('ZFP_SRV');
					var oUIModel = this.getView().getModel("PeriodsUI");
					var aPeriods = oUIModel.getProperty("/");
					for (var i = 0; i < aPeriods.length; i++) {
						if (aPeriods[i].isChanged === true) {
							delete aPeriods[i].isChanged;
							oModelBackEnd.update("/HolidayPassPeriodSet(Id='" + aPeriods[i].Id + "',Startdate=" + ODataUtils.formatValue(aPeriods[i].Startdate,
									"Edm.DateTime") +
								",Enddate=" + ODataUtils.formatValue(aPeriods[i].Enddate, "Edm.DateTime") + ")",
								aPeriods[i], {
									success: function(oData, response) {
										MessageBox.success("Erfolgreich gesichert");
									},
									error: function(oError) {
										MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
									}
								});
						}
					}
					break;
				case "saveBaseSetting":
					var oModelBackEnd = this.getOwnerComponent().getModel('ZFP_SRV');
					var oUpdatedBaseSettings = this.getView().getModel("BaseSettingUIModel").getProperty("/");
					oUpdatedBaseSettings.Printer = this.getView().byId("oSelectPrinter").getSelectedKey();
					oModelBackEnd.create("/BaseSettingSet", oUpdatedBaseSettings, {
						success: function(oData, response) {
							MessageBox.success("Erfolgreich gesichert");
						},
						error: function(oError) {
							MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
						}
					});
					break;
				case "savePrice":
					var oModelBackEnd = this.getOwnerComponent().getModel('ZFP_SRV');
					var oUIModel = this.getView().getModel("PriceUI");
					var aPrices = oUIModel.getProperty("/");
					for (var i = 0; i < aPrices.length; i++) {
						if (aPrices[i].isChanged === true) {
							delete aPrices[i].isChanged;
							delete aPrices[i].IsDeleteAllowed;
							aPrices[i].PriceBieler = aPrices[i].PriceBieler.toString();
							aPrices[i].PriceBielerPlus = aPrices[i].PriceBielerPlus.toString();
							aPrices[i].PriceNotBieler = aPrices[i].PriceNotBieler.toString();
							oModelBackEnd.update("/PricingSet('" + aPrices[i].Type + "')",
								aPrices[i], {
									success: function(oData, response) {
										MessageBox.success("Erfolgreich gesichert");
									},
									error: function(oError) {
										MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
									}
								});
						}
					}
					break;
				default:

			}
		},
		onCancel: function(oEvent) {
			var id = oEvent.getParameters().id;
			var pos = id.lastIndexOf("--");
			id = id.substring(pos + 2, id.length);

			switch (id) {
				case "cancelPeriods":
					this.loadPeriodData();
					break;
				case "cancelBaseSetting":
					this.loadBaseSetting();
					break;
				default:
					break;
			}
		},
		loadBaseSetting: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			oModel.setUseBatch(false);
			var oUIModel = this.getView().getModel("BaseSettingUIModel");
			oModel.read('/BaseSettingSet', {
				success: function(oData, response) {
					oUIModel.setProperty("/", oData.results[0]);
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false
			});

		},
		loadPriceData: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			oModel.setUseBatch(false);
			var oUIModel = this.getView().getModel("PriceUI");
			oModel.read('/PricingSet', {
				success: function(oData, response) {
					//	var oModelData = { periods : oData };
					var aPrices = oData.results;
					var aTypesNotAllowedToDelete = ["A1", "A2", "B1+", "ACT", "C"];
					for (var i = 0; i < aPrices.length; i++) {
						aPrices[i].PriceBieler = parseInt(aPrices[i].PriceBieler);
						aPrices[i].PriceBielerPlus = parseInt(aPrices[i].PriceBielerPlus);
						aPrices[i].PriceNotBieler = parseInt(aPrices[i].PriceNotBieler);
						if (aTypesNotAllowedToDelete.indexOf(aPrices[i].Type) === -1) {
							aPrices[i].IsDeleteAllowed = true;
						} else {
							aPrices[i].IsDeleteAllowed = false;
						}

					}
					oUIModel.setProperty("/", aPrices);
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false
			});
		},

		loadPeriodData: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			oModel.setUseBatch(false);
			var oUIModel = this.getView().getModel("PeriodsUI");
			oModel.read('/HolidayPassPeriodSet', {
				success: function(oData, response) {
					//	var oModelData = { periods : oData };
					oUIModel.setProperty("/", oData.results);
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				}
			});
		},
		onChangePartOfDay: function(oEvent) {
			var sPath = oEvent.getSource().getBindingContext("ZFP_SRV").getPath();
			var aPartOfDayToUpdate = this.getOwnerComponent().getModel('control').getProperty("/part_of_day_to_update");
			if (aPartOfDayToUpdate.indexOf(sPath) === -1) {
				aPartOfDayToUpdate.push(sPath);
				this.getOwnerComponent().getModel('control').setProperty("/part_of_day_to_update", aPartOfDayToUpdate);
			}
		},
		onChangeInvoiceTitle: function(oEvent) {
			var sPath = oEvent.getSource().getBindingContext("ZFP_SRV").getPath();
			var aPeriodTitlesToUpdate = this.getOwnerComponent().getModel('control').getProperty("/period_titles_to_update");
			if (aPeriodTitlesToUpdate.indexOf(sPath) === -1) {
				aPeriodTitlesToUpdate.push(sPath);
				this.getOwnerComponent().getModel('control').setProperty("/period_titles_to_update", aPeriodTitlesToUpdate);
			}
		},
		onInit: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			this.getOwnerComponent().getModel('control').setProperty("/period_titles_to_update", []);
			this.getOwnerComponent().getModel('control').setProperty("/part_of_day_to_update", []);
			var oUIModelPeriods = new sap.ui.model.json.JSONModel();
			var oUIModelPrices = new sap.ui.model.json.JSONModel();
			var oUIModelBaseSettings = new sap.ui.model.json.JSONModel();
			var oUIModelNewPartOfDay = new sap.ui.model.json.JSONModel({
				id: "",
				text_d: "",
				text_f: ""
			});
			var that = this;
			var oView = this.getView();
			oView.setModel(oUIModelNewPartOfDay, "NewPartOfDay");
			oView.setModel(oUIModelPeriods, "PriceUI");
			oView.setModel(oUIModelBaseSettings, "BaseSettingUIModel");
			this.loadBaseSetting();

			oView.setModel(oUIModelPeriods, "PeriodsUI");

			this.oReadOnlyTemplateTablePartOfDays = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text("oTextIdPartOfDay", {
						text: "{ZFP_SRV>Id}"
					}), new sap.m.Text({
						text: "{ZFP_SRV>TitleD}"
					}), new sap.m.Text({
						text: "{ZFP_SRV>TitleF}"
					}), new sap.m.Button("oButtonDeletePartOfDay", {
						text: "Löschen",
						press: function(oEvent) {
							that.onDeletePartOfDay(oEvent);
						}
					})
				]
			});
			this.rebindTablePartOfDay(this.oReadOnlyTemplateTablePartOfDays);
			this.oEditableTemplateTablePartOfDays = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text({
						text: "{ZFP_SRV>Id}"
					}), new sap.m.Input({
						value: "{ZFP_SRV>TitleD}",
						liveChange: function(oEvent) {
							that.onChangePartOfDay(oEvent);
						}
					}), new sap.m.Input({
						value: "{ZFP_SRV>TitleF}",
						liveChange: function(oEvent) {
							that.onChangePartOfDay(oEvent);
						}
					})
				]
			});

			this.oReadOnlyTemplateTableInvoiceTitles = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text({
						text: "{ZFP_SRV>Period}"
					}), new sap.m.Text({
						text: "{ZFP_SRV>Title}"
					}), new sap.m.Text({
						text: "{ZFP_SRV>Directory}"
					}), new sap.m.DatePicker({
						value: "{path : 'ZFP_SRV>PrintDate' , type:'sap.ui.model.type.Date', formatOptions: { style: 'medium', UTC: true, strictParsing: true} }",
						//	valueFormat : "yyyy-MM-dd",
						displayFormat: "long",
						class: "sapUiSmallMarginBottom",
						enabled: false
					})
				]
			});

			this.rebindTableInvoiceTitles(this.oReadOnlyTemplateTableInvoiceTitles);
			this.oEditableTemplateTableInvoiceTitles = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text({
						text: "{ZFP_SRV>Period}"
					}), new sap.m.Input({
						value: "{ZFP_SRV>Title}",
						liveChange: function(oEvent) {
							that.onChangeInvoiceTitle(oEvent);
						}
					}), new sap.m.Input({
						value: "{ZFP_SRV>Directory}",
						liveChange: function(oEvent) {
							that.onChangeInvoiceTitle(oEvent);
						}
					}), new sap.m.DatePicker({
						value: "{path : 'ZFP_SRV>PrintDate' , type:'sap.ui.model.type.Date', formatOptions: { style: 'medium', UTC: true, strictParsing: true} }",
						//		valueFormat : "yyyy-MM-dd",
						displayFormat: "long",
						class: "sapUiSmallMarginBottom",
						enabled: true,
						change: function(oEvent) {
							that.onChangeInvoiceTitle(oEvent);
						}
					})
				]
			});
		},

		onDeletePartOfDay: function(oEvent) {
			/**
			 * Dieses Vorgehen ist sicherlich nicht der optimal Weg, da auf den Ids der einzelnen Objecte aufgebaut wird und man nach Empfehlung von SAP eigentlich sap.ui.getCore
			 * nicht verwendet sollte. Da es jedoch eine Funktion ist, welche eh nicht oft verwendet werden wird, ist dies nicht so tragisch, da es einen Workaround auf DB Ebene
			 * gibt.
			 */

			var sPressedButton = oEvent.getParameter("id");
			var sString = sPressedButton.substring(22, sPressedButton.length);
			var sPathToPartOfDatToDelete = sap.ui.getCore().byId("oTextIdPartOfDay" + sString).getBindingContext("ZFP_SRV").sPath;

			this.getOwnerComponent().getModel('ZFP_SRV').remove(sPathToPartOfDatToDelete, {
				success: function(oData, response) {
					MessageBox.success("Erfolgreich gelöscht");
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				}
			});

		},

		rebindTablePartOfDay: function(oTemplate) {
			this.getView().byId("oTablePartOfDays").bindItems({
				path: "ZFP_SRV>/PartOfDaySet",
				sorter: {
					path: 'Id'
				},
				template: oTemplate,
				key: "Id"
			});
		},

		rebindTableInvoiceTitles: function(oTemplate) {

			this.getView().byId("oTableInvoiceTitles").bindItems({
				path: "ZFP_SRV>/PeriodInvoiceTitleSet",
				sorter: {
					path: 'Period'
				},
				template: oTemplate,
				key: "Period"
			});
		},
		onEditPartOfDay: function() {
			this.getView().byId("newPartOfDayButton").setVisible(false);
			this.getView().byId("editPartOfDayButton").setVisible(false);
			this.getView().byId("savePartOfDayButton").setVisible(true);
			this.getView().byId("cancelPartOfDayButton").setVisible(true);
			this.rebindTablePartOfDay(this.oEditableTemplateTablePartOfDays);
		},

		onEditInvoiceTitle: function() {
			this.getView().byId("editButton").setVisible(false);
			this.getView().byId("saveButton").setVisible(true);
			this.getView().byId("cancelButton").setVisible(true);
			this.rebindTableInvoiceTitles(this.oEditableTemplateTableInvoiceTitles);
		},

		onSaveInvoiceTitle: function() {

			var aPeriodTitlesToUpdate = this.getOwnerComponent().getModel('control').getProperty("/period_titles_to_update");
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			for (var i = 0; aPeriodTitlesToUpdate.length > i; i++) {

				var oPeriodToUpdate = oModel.getProperty(aPeriodTitlesToUpdate[i]);
				oModel.update(aPeriodTitlesToUpdate[i],
					oPeriodToUpdate, {
						success: function(oData, response) {
							MessageBox.success("Erfolgreich gesichert");
						},
						error: function(oError) {
							MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
						}
					});

			}

			this.getView().byId("saveButton").setVisible(false);
			this.getView().byId("cancelButton").setVisible(false);
			this.getView().byId("editButton").setVisible(true);
			this.getOwnerComponent().getModel('control').setProperty("/period_titles_to_update", []);
			this.rebindTableInvoiceTitles(this.oReadOnlyTemplateTableInvoiceTitles);
		},

		onCancelPartOfDay: function() {
			this.getView().byId("newPartOfDayButton").setVisible(true);
			this.getView().byId("editPartOfDayButton").setVisible(true);
			this.getView().byId("savePartOfDayButton").setVisible(false);
			this.getView().byId("cancelPartOfDayButton").setVisible(false);
			this.rebindTablePartOfDay(this.oReadOnlyTemplateTablePartOfDays);
			this.getOwnerComponent().getModel('control').setProperty("/part_of_day_to_update", []);
		},

		onCancelInvoiceTitle: function() {
			this.getView().byId("cancelButton").setVisible(false);
			this.getView().byId("saveButton").setVisible(false);
			this.getView().byId("editButton").setVisible(true);
			this.getOwnerComponent().getModel('control').setProperty("/period_titles_to_update", []);
			this.rebindTableInvoiceTitles(this.oReadOnlyTemplateTableInvoiceTitles);
		},

		onExit: function() {
			if (this._oPopover) {
				this._oPopover.destroy();
			}
		},
		onShowPopoverNewPrice: function(oButton, oController) {
			// create popover
			if (!oController._oPopover_NewPrice) {
				oController._oPopover_NewPrice = sap.ui.xmlfragment("ch.bielHolidayPassCustomizing.fragments.newPrice", this);
				oController.getView().addDependent(oController._oPopover_NewPrice);
			} else {
				sap.ui.getCore().byId("oInputType").setValue("");
				sap.ui.getCore().byId("oInputPriceBielerPlus").setValue("");
				sap.ui.getCore().byId("oInputPriceNotBieler").setValue("");
				sap.ui.getCore().byId("oInputPriceBieler").setValue("");
			}

			// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
			jQuery.sap.delayedCall(0, oController, function() {
				oController._oPopover_NewPrice.openBy(oButton);
			});
		},
		onShowPopoverNewPeriod: function(oButton, oController) {
			// create popover
			if (!oController._oPopover) {
				oController._oPopover = sap.ui.xmlfragment("ch.bielHolidayPassCustomizing.fragments.newPeriod", this);
				oController.getView().addDependent(oController._oPopover);
			}

			// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
			jQuery.sap.delayedCall(0, oController, function() {
				oController._oPopover.openBy(oButton);
			});
		},
		markChanged: function(oEvent) {
			var sIdOfChangedItem = oEvent.getSource().getId();
			var iIndex = sIdOfChangedItem.substring(sIdOfChangedItem.lastIndexOf("-") + 1, sIdOfChangedItem.length);
			var sTablename = sIdOfChangedItem.substring(sIdOfChangedItem.lastIndexOf("--") + 2, sIdOfChangedItem.lastIndexOf("-"));
			var sModelName = "";
			switch (sTablename) {
				case "idPeriodesTable":
					sModelName = "PeriodsUI";
					break;
				case "idPriceTable":
					sModelName = "PriceUI";
			}
			var oUIModel = this.getView().getModel(sModelName);
			oUIModel.setProperty("/" + iIndex + "/isChanged", true);

		},
		onNewPrice: function(oEvent) {
			this.onShowPopoverNewPrice(oEvent.getSource(), this);
		},

		onNewPeriod: function(oEvent) {
			var oButton = oEvent.getSource();
			var oView = this.getView();
			var that = this;
			var oNewPeriodModel = new sap.ui.model.json.JSONModel({
				isNewPeriod: true,
				PeriodId: '',
				TextF: '',
				StartDate: null,
				EndDate: null,
				TextD: '',
				existingPeriods: [],
				IsLatePaymentAllowed: false
			});
			oView.setModel(oNewPeriodModel, "NewPeriodUIModel");
			MessageBox.show("Neue Periode anlegen oder Zeitraum zu bestehender Periode hinzufügen ?", {
				icon: MessageBox.Icon.INFORMATION,
				title: "Entscheidung",
				actions: ["Neue Periode anlegen", "Neuer Zeitraum"],
				id: "messageBoxId1",
				onClose: function(sSelectedButton) {
					switch (sSelectedButton) {
						case "Neue Periode anlegen":
							var oModel = that.getOwnerComponent().getModel('ZFP_SRV');
							oModel.callFunction("/getNextValue", {
								method: "GET",
								urlParameters: {
									entity: 'period'
								},
								success: function(oData, response) {
									oNewPeriodModel.setProperty("/PeriodId", oData.nextValue);
									oNewPeriodModel.setProperty("/isNewPeriod", true);
								},
								error: function(oError) {
									MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
								},
								async: false
							});

							break;
						case "Neuer Zeitraum":
							oNewPeriodModel.setProperty("/isNewPeriod", false);
							var aPeriods = oView.getModel("PeriodsUI").getProperty("/");
							var aPeriodsValueHelp = [];
							for (var i in aPeriods) {
								if (aPeriodsValueHelp.indexOf(aPeriods[i].Id) === -1) {
									aPeriodsValueHelp.push(aPeriods[i].Id);
								}
							}
							var aPeriodsValueHelpKeys = [];
							for (i in aPeriodsValueHelp) {
								var newEntry = {
									key: aPeriodsValueHelp[i]
								};
								aPeriodsValueHelpKeys.push(newEntry);
							}
							oNewPeriodModel.setProperty("/existingPeriods", aPeriodsValueHelpKeys);
							break;
					}
					that.onShowPopoverNewPeriod(oButton, that);
				}
			});

		},
		onCancelNewPrice: function() {
			this._oPopover_NewPrice.close();
		},
		onCancelNewPeriod: function() {
			this._oPopover.close();
		},
		onSaveNewPrice: function() {
			var oNewPrice = {
				Type: sap.ui.getCore().byId("oInputType").getValue(),
				PriceBielerPlus: sap.ui.getCore().byId("oInputPriceBielerPlus").getValue(),
				PriceNotBieler: sap.ui.getCore().byId("oInputPriceNotBieler").getValue(),
				PriceBieler: sap.ui.getCore().byId("oInputPriceBieler").getValue()
			};
			var oModel = this.getOwnerComponent().getModel("ZFP_SRV");
			oModel.create("/PricingSet", oNewPrice, {
				success: function(oData, response) {
					MessageBox.success("Erfolgreich gesichert");
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false
			});
			this._oPopover_NewPrice.close();
			this.loadPriceData();
		},
		onSaveNewPeriod: function() {
			var oModelNewPeriod = this.getView().getModel("NewPeriodUIModel");
			var oNewPeriodRequest = {
				Startdate: new Date(oModelNewPeriod.getProperty("/StartDate")),
				Enddate: new Date(oModelNewPeriod.getProperty("/EndDate")),
				TextF: oModelNewPeriod.getProperty("/TextF"),
				TextD: oModelNewPeriod.getProperty("/TextD"),
				IsLatePaymentAllowed: oModelNewPeriod.getProperty("/IsLatePaymentAllowed")
			};
			if (oModelNewPeriod.getProperty("/isNewPeriod") === false) {
				oNewPeriodRequest.Id = oModelNewPeriod.getProperty("/periodId");
			}
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			oModel.create("/HolidayPassPeriodSet", oNewPeriodRequest, {
				success: function(oData, respone) {
					MessageBox.success("Erfolgreich gesichert");
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false

			});
			this._oPopover.close();
			this.loadPeriodData();
		}

	});
});