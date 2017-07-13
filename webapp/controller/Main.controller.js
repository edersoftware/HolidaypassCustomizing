sap.ui.define([
	'sap/m/MessageBox',
	'sap/ui/model/odata/ODataUtils',
	"sap/ui/core/mvc/Controller"
], function(MessageBox, ODataUtils, Controller) {
	"use strict";

	return Controller.extend("ch.bielHolidayPassCustomizing.controller.Main", {
		handleGetNextSAPInvoiceNumber: function() {
			var that = this;
			var sYear = this.getView().getModel("BaseSettingUIModel").getProperty("/BillingYear");
			this.getOwnerComponent().getModel('ZFP_SRV').callFunction("/getNextFPInvoiceNumber", {
				method: "GET",
				urlParameters: {
					year: sYear
				},
				success: function(oData, response) {
					that.getView().getModel("BaseSettingUIModel").setProperty("/BillingNumberAct", oData.number);
					that.enableSaveAndCancelBaseSettings();
				},
				error: function(oError) {
					MessageBox.error("Technisches Problem aufgetreten, bitte SAP CCC informieren.");
				},
				async: false
			});
		},
		handleGetNextSAPDebitorNumber: function() {
			var that = this;
			this.getOwnerComponent().getModel('ZFP_SRV').callFunction("/getNextFPSAPDebitorNumber", {
				method: "GET",
				success: function(oData, response) {
					that.getView().getModel("BaseSettingUIModel").setProperty("/SapDebitorAct", oData.number);
					that.enableSaveAndCancelBaseSettings();
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
			sap.ui.core.BusyIndicator.show(0);
			oModel.remove("/PricingSet('" + oPriceToRemove.Type + "')", {
				success: function(oData, response) {
					that.loadPriceData();
					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: true
			});

		},
		onCancelNewPartOfDay: function() {
			this._oPopover_NewPartOfDay.close();
		},
		onSaveNewPartOfDay: function() {
			var that = this;
			var oNewPartOfDay = {
				Id: this.getView().getModel("NewPartOfDay").getProperty("/id"),
				TitleD: this.getView().getModel("NewPartOfDay").getProperty("/text_d"),
				TitleF: this.getView().getModel("NewPartOfDay").getProperty("/text_f")
			};

			this.getOwnerComponent().getModel('ZFP_SRV').create("/PartOfDaySet", oNewPartOfDay, {
				success: function(oData, response) {
					that.loadPartOfDayData();
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
					},
					async: true
				});
		},
		onSelectTab: function(oEvent) {
			var key = oEvent.getParameter("key");
			switch (key) {
				case "periods":
					this.loadPeriodData();
					this.getView().byId("savePeriods").setEnabled(false);
					this.getView().byId("cancelPeriods").setEnabled(false);
					break;
				case "prices":
					this.loadPriceData();
					this.getView().byId("cancelPrice").setEnabled(false);
					this.getView().byId("savePrice").setEnabled(false);
					break;
				case "baseSetting":
					this.getView().byId("cancelBaseSetting").setEnabled(false);
					this.getView().byId("saveBaseSetting").setEnabled(false);
					this.loadBaseSetting();
					break;
				case "billingPeriod":
					this.loadInvoiceTitleData();
					this.getView().byId("saveInvoiceTitle").setEnabled(false);
					this.getView().byId("cancelInvoiceTitle").setEnabled(false);
					break;
				case "partOfDay":
					this.loadPartOfDayData();
					this.getView().byId("savePartOfDay").setEnabled(false);
					this.getView().byId("cancelPartOfDay").setEnabled(false);
					break;
			}

		},
		_getChangedObjects: function(aAllObjects) {
			var aChangedObjects = [];
			for (var i = 0; aAllObjects.length > i; i++) {
				if (aAllObjects[i].isChanged) {
					aChangedObjects.push(aAllObjects[i]);
				}
			}
			return aChangedObjects;
		},
		_updateEntity: function(_sPath, _oEntity, _isLastObject) {
			var oModel = this.getOwnerComponent().getModel("ZFP_SRV");
			oModel.update(_sPath, _oEntity, {
				success: function() {
					if (_isLastObject) {
						sap.ui.core.BusyIndicator.hide();
						oModel.refresh(true);
					}
				},
				error: function() {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: true
			});
		},
		onSave: function(oEvent) {
			sap.ui.core.BusyIndicator.show(0);
			var id = oEvent.getParameters().id;
			var pos = id.lastIndexOf("--");
			var that = this;
			id = id.substring(pos + 2, id.length);
			switch (id) {
				case "saveInvoiceTitle":
					var aInvoiceTitles = this._getChangedObjects(this.getView().getModel("invoiceTitle").getProperty("/"));
					for (var i = 0; i < aInvoiceTitles.length; i++) {
						aInvoiceTitles[i].isChanged = false;
						var sPath = "/PeriodInvoiceTitleSet('" + aInvoiceTitles[i].Period + "')";
						var isLastObject = (aInvoiceTitles.length === (i + 1)) ? true : false;
						var oInvoiceTitleToUpdate = {
							Directory: aInvoiceTitles[i].Directory,
							PrintDate: aInvoiceTitles[i].PrintDate,
							Title: aInvoiceTitles[i].Title
						};
						this._updateEntity(sPath, oInvoiceTitleToUpdate, isLastObject);
					}
					this.getView().byId("cancelInvoiceTitle").setEnabled(false);
					this.getView().byId("saveInvoiceTitle").setEnabled(false);
					break;
				case "savePeriods":
					var aPeriods = this._getChangedObjects(this.getView().getModel("PeriodsUI").getProperty("/"));
					for (i = 0; i < aPeriods.length; i++) {
						delete aPeriods[i].isChanged;
						sPath = "/HolidayPassPeriodSet(Id='" + aPeriods[i].Id + "',Startdate=" + ODataUtils.formatValue(aPeriods[i].Startdate,
								"Edm.DateTime") +
							",Enddate=" + ODataUtils.formatValue(aPeriods[i].Enddate, "Edm.DateTime") + ")";
						isLastObject = (aPeriods.length === (i + 1)) ? true : false;
						this._updateEntity(sPath, aPeriods[i], isLastObject);
					}
					this.getView().byId("cancelPeriods").setEnabled(false);
					this.getView().byId("savePeriods").setEnabled(false);
					break;
				case "saveBaseSetting":
					var oUpdatedBaseSettings = this.getView().getModel("BaseSettingUIModel").getProperty("/");
					oUpdatedBaseSettings.Printer = this.getView().byId("oSelectPrinter").getSelectedKey();
					this.getOwnerComponent().getModel("ZFP_SRV").create("/BaseSettingSet", oUpdatedBaseSettings, {
						success: function() {
							sap.ui.core.BusyIndicator.hide();
							that.getView().byId("cancelBaseSetting").setEnabled(false);
							that.getView().byId("saveBaseSetting").setEnabled(false);
						},
						error: function() {
							MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
							sap.ui.core.BusyIndicator.hide();
						},
						async: true
					});
					break;
				case "savePrice":
					var aPrices = this._getChangedObjects(this.getView().getModel("PriceUI").getProperty("/"));
					this.getView().byId("savePrice").setEnabled(false);
					this.getView().byId("cancelPrice").setEnabled(false);
					for (i = 0; i < aPrices.length; i++) {
						var oPriceToUpdate = {
							PriceBieler: aPrices[i].PriceBieler.toString(),
							PriceBielerPlus: aPrices[i].PriceBielerPlus.toString(),
							PriceNotBieler: aPrices[i].PriceNotBieler.toString(),
							Type: aPrices[i].Type
						};
						aPrices[i].isChanged = false;
						isLastObject = (aPrices.length === (i + 1)) ? true : false;
						this._updateEntity("/PricingSet('" + aPrices[i].Type + "')", oPriceToUpdate, isLastObject);
					}

					break;
				case "savePartOfDay":
					var aPartOfDay = this._getChangedObjects(this.getView().getModel("partOfDay").getProperty("/"));
					this.getView().byId("savePartOfDay").setEnabled(false);
					this.getView().byId("cancelPartOfDay").setEnabled(false);
					for (i = 0; i < aPartOfDay.length; i++) {
						var oPartOfDayToUpdate = {
							Id: aPartOfDay[i].Id,
							TitleD: aPartOfDay[i].TitleD,
							TitleF: aPartOfDay[i].TitleF
						};
						aPartOfDay[i].isChanged = false;
						isLastObject = (aPartOfDay.length === (i + 1)) ? true : false;
						this._updateEntity("/PartOfDaySet('" +oPartOfDayToUpdate.Id + "')", oPartOfDayToUpdate, isLastObject);
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
				case "cancelPrice":
					this.loadPriceData();
					this.getView().byId("cancelPrice").setEnabled(false);
					this.getView().byId("savePrice").setEnabled(false);
					break;
				case "cancelPeriods":
					this.loadPeriodData();
					this.getView().byId("cancelPeriods").setEnabled(false);
					this.getView().byId("savePeriods").setEnabled(false);
					break;
				case "cancelBaseSetting":
					this.getView().byId("cancelBaseSetting").setEnabled(false);
					this.getView().byId("saveBaseSetting").setEnabled(false);
					this.loadBaseSetting();
					break;
				case "cancelInvoiceTitle":
					this.getView().byId("cancelInvoiceTitle").setEnabled(false);
					this.getView().byId("saveInvoiceTitle").setEnabled(false);
					this.loadInvoiceTitleData();
					break;
				case "cancelPartOfDay":
					this.getView().byId("cancelPartOfDay").setEnabled(false);
					this.getView().byId("savePartOfDay").setEnabled(false);
					this.loadPartOfDayData()();
					break;
				default:
					break;
			}
		},
		loadBaseSetting: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			oModel.setUseBatch(false);
			var oUIModel = this.getOwnerComponent().getModel("BaseSettingUIModel");
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
		loadPartOfDayData: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			var oUIModel = this.getOwnerComponent().getModel("partOfDay");
			oModel.read('/PartOfDaySet', {
				success: function(oData) {
					oUIModel.setProperty("/", oData.results);
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: false
			});
		},
		loadInvoiceTitleData: function() {
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');
			var oUIModel = this.getOwnerComponent().getModel("invoiceTitle");
			oModel.read('/PeriodInvoiceTitleSet', {
				success: function(oData) {
					var aInvoiceTitle = oData.results;
					oUIModel.setProperty("/", aInvoiceTitle);
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

		onInit: function() {
			var oUIModelNewPartOfDay = new sap.ui.model.json.JSONModel({
				id: "",
				text_d: "",
				text_f: ""
			});
			this.getView().setModel(oUIModelNewPartOfDay, "NewPartOfDay");
			this.loadBaseSetting();
		},

		onDeletePartOfDay: function(oEvent) {
			var that = this;
			var sPressedButton = oEvent.getParameter("id");
			var pos = sPressedButton.lastIndexOf("-");
			var index = sPressedButton.substring(pos + 1, sPressedButton.length);
			var oPartOfDayToRemove = this.getView().getModel("partOfDay").getProperty("/" + index);
			var oModel = this.getOwnerComponent().getModel('ZFP_SRV');

			oModel.remove("/PartOfDaySet('" + oPartOfDayToRemove.Id + "')", {
				success: function(oData, response) {
					that.loadPartOfDayData();
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
				},
				async: true
			});
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
		enableSaveAndCancelBaseSettings: function() {
			this.getView().byId("cancelBaseSetting").setEnabled(true);
			this.getView().byId("saveBaseSetting").setEnabled(true);
		},
		markChanged: function(oEvent) {
			var sIdOfChangedItem = oEvent.getSource().getId();
			var iIndex = sIdOfChangedItem.substring(sIdOfChangedItem.lastIndexOf("-") + 1, sIdOfChangedItem.length);
			var sTablename = sIdOfChangedItem.substring(sIdOfChangedItem.lastIndexOf("--") + 2, sIdOfChangedItem.lastIndexOf("-"));
			var sModelName = "";
			switch (sTablename) {
				case "idPeriodesTable":
					sModelName = "PeriodsUI";
					this.getView().byId("cancelPeriods").setEnabled(true);
					this.getView().byId("savePeriods").setEnabled(true);
					break;
				case "idPriceTable":
					sModelName = "PriceUI";
					this.getView().byId("cancelPrice").setEnabled(true);
					this.getView().byId("savePrice").setEnabled(true);
					break;
				case "oTableInvoiceTitles":
					sModelName = "invoiceTitle";
					this.getView().byId("cancelInvoiceTitle").setEnabled(true);
					this.getView().byId("saveInvoiceTitle").setEnabled(true);
					break;
				case "oTablePartOfDays":
					sModelName = "partOfDay";
					this.getView().byId("cancelPartOfDay").setEnabled(true);
					this.getView().byId("savePartOfDay").setEnabled(true);
					break;

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
			var bDoOpenNext = true;
			MessageBox.show("Neue Periode anlegen oder Zeitraum zu bestehender Periode hinzufügen ?", {
				icon: MessageBox.Icon.INFORMATION,
				title: "Entscheidung",
				actions: ["Abbrechen", "Neue Periode anlegen", "Neuer Zeitraum"],
				onClose: function(sSelectedButton) {
					switch (sSelectedButton) {
						case "Abbrechen":
							bDoOpenNext = false;
							break;
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
					if (bDoOpenNext) {
						that.onShowPopoverNewPeriod(oButton, that);
					}
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
			var that = this;
			var oNewPrice = {
				Type: sap.ui.getCore().byId("oInputType").getValue(),
				PriceBielerPlus: sap.ui.getCore().byId("oInputPriceBielerPlus").getValue(),
				PriceNotBieler: sap.ui.getCore().byId("oInputPriceNotBieler").getValue(),
				PriceBieler: sap.ui.getCore().byId("oInputPriceBieler").getValue()
			};
			sap.ui.core.BusyIndicator.show(0);
			var oModel = this.getOwnerComponent().getModel("ZFP_SRV");
			oModel.create("/PricingSet", oNewPrice, {
				success: function(oData, response) {
					that.loadPriceData();
					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
					sap.ui.core.BusyIndicator.hide();
				},
				async: true
			});
			this._oPopover_NewPrice.close();

		},
		onSaveNewPeriod: function() {
			var that = this;
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
			sap.ui.core.BusyIndicator.show(0);
			oModel.create("/HolidayPassPeriodSet", oNewPeriodRequest, {
				success: function(oData, respone) {
					sap.ui.core.BusyIndicator.hide();
					that.loadPeriodData();
				},
				error: function(oError) {
					MessageBox.error("Technischer Fehler, bitte SAP CCC informieren");
					sap.ui.core.BusyIndicator.hide();
				},
				async: true

			});
			this._oPopover.close();

		}

	});
});